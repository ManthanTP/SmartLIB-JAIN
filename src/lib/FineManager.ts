import { supabase } from './supabase';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

export const FineManager = {
    /**
     * Updates fine_amount for all active loans that are overdue.
     * Should be triggered via a heartbeat (e.g., on Admin Dashboard load).
     */
    async updateOverdueFines() {
        console.log('[FineManager] Checking for overdue fines...');

        try {
            // 1. Fetch current fine rate
            const { data: settings } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'general_config')
                .single();

            const finePerDay = settings?.setting_value?.fine_per_day || 5;
            const today = startOfDay(new Date());

            // 2. Fetch all active loans
            const { data: activeLoans, error: fetchError } = await supabase
                .from('active_loans')
                .select('id, due_date, fine_amount');

            if (fetchError) throw fetchError;
            if (!activeLoans) return;

            const updates = [];

            for (const loan of activeLoans) {
                // Ensure we compare start-of-day for both to avoid timezone/time-of-day edge cases
                const dueDate = startOfDay(new Date(loan.due_date));

                if (dueDate < today) {
                    // Calculate days overdue (difference in calendar days is safer for library logic)
                    const daysOverdue = differenceInCalendarDays(today, dueDate);
                    const calculatedFine = daysOverdue * finePerDay;
                    const currentFine = Number(loan.fine_amount) || 0;

                    // Only update if the fine has changed
                    if (calculatedFine !== currentFine) {
                        updates.push(
                            supabase
                                .from('active_loans')
                                .update({ fine_amount: calculatedFine })
                                .eq('id', loan.id)
                        );
                    }
                }
            }

            if (updates.length > 0) {
                console.log(`[FineManager] Updating ${updates.length} overdue loans...`);
                await Promise.all(updates);
                console.log('[FineManager] Fines updated successfully.');
            } else {
                console.log('[FineManager] No fine updates needed.');
            }

        } catch (error) {
            console.error('[FineManager] Error updating fines:', error);
        }
    }
};
