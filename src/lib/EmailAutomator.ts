import { supabase } from './supabase';
import { sendDueDateReminder, sendFineAlert } from './email';

export const EmailAutomator = {
    /**
     * Heartbeat function called on Admin Dashboard load.
     * Checks for:
     * 1. Books due in exactly 3 days (Reminder).
     * 2. Books overdue by 1 day (Overdue alert).
     */
    async heartbeat() {
        console.log('[EmailAutomator] Running heartbeat check...');
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // 1. Fetch loans due in 3 days
        const { data: dueSoon } = await supabase
            .from('active_loans')
            .select('*, student:users(full_name, email), book:books(title)')
            .eq('due_date', formatDate(threeDaysFromNow))
            .is('last_reminder_sent', null);

        if (dueSoon) {
            for (const loan of dueSoon) {
                if (!(loan.student as any).email) continue;

                await sendDueDateReminder(
                    (loan.student as any).email,
                    (loan.student as any).full_name,
                    (loan.book as any).title,
                    loan.due_date
                );

                // Mark as reminder sent
                await supabase.from('active_loans')
                    .update({ last_reminder_sent: new Date().toISOString() })
                    .eq('id', loan.id);
            }
        }

        // 2. Fetch current fine rate for fallback
        const { data: settings } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'general_config')
            .single();
        const finePerDay = settings?.setting_value?.fine_per_day || 5;

        // 3. Fetch loans that became overdue yesterday
        const { data: overdue } = await supabase
            .from('active_loans')
            .select('*, student:users(full_name, email), book:books(title)')
            .eq('due_date', formatDate(yesterday));

        if (overdue) {
            for (const loan of overdue) {
                if (!(loan.student as any).email) continue;

                // Use the fine stored in DB (updated by FineManager) or fallback to 1-day fine
                const fineToReport = loan.fine_amount > 0 ? loan.fine_amount : finePerDay;

                await sendFineAlert(
                    (loan.student as any).email,
                    (loan.student as any).full_name,
                    (loan.book as any).title,
                    fineToReport,
                    loan.due_date
                );
            }
        }
    }
};
