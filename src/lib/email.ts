import emailjs from '@emailjs/browser';

// Configuration from Reference Code
const SERVICE_ID = 'service_va3jie2';
const TEMPLATE_WELCOME = 'template_8kko542'; // Account Approved
const TEMPLATE_CIRCULATION = 'template_f62uit1'; // Due Reminder / Overdue Alert
const PUBLIC_KEY = '3WDC6v08yaKoDxcNZ';

export const initEmail = () => {
    try {
        emailjs.init(PUBLIC_KEY);
        console.log('EmailJS initialized successfully');
    } catch (error) {
        console.error('EmailJS initialization failed:', error);
    }
};

interface EmailParams {
    to_email: string;
    to_name?: string;
    subject?: string;
    message?: string;
    [key: string]: any;
}

export const sendEmail = async (templateId: string, params: EmailParams) => {
    try {
        console.log(`[EmailJS] Attempting to send template: ${templateId}`, {
            serviceId: SERVICE_ID,
            to: params.to_email,
            params: params
        });

        const result = await emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY);
        console.log('[EmailJS] Result:', result);
        return true;
    } catch (error: any) {
        console.error('[EmailJS] Error details:', {
            status: error?.status,
            text: error?.text,
            message: error?.message || error
        });
        return false;
    }
};

export const sendDueDateReminder = async (email: string, name: string, bookTitle: string, dueDate: string) => {
    return sendEmail(TEMPLATE_CIRCULATION, {
        to_email: email,
        student_name: name, // Matches merged template
        alert_type: 'Due Reminder',
        message: `This is a reminder that your book is due soon. Please return it on time to avoid fines.`,
        book_title: bookTitle,
        due_date: dueDate,
        fine_amount: '0'
    });
};

export const sendBookAvailableNotification = async (email: string, name: string, bookTitle: string) => {
    return sendEmail(TEMPLATE_CIRCULATION, {
        to_email: email,
        student_name: name,
        alert_type: 'Book Available',
        message: `Great news! Your requested book is now available for pickup.`,
        book_title: bookTitle,
        due_date: 'Ready for Pickup',
        fine_amount: 'None'
    });
};

export const sendFineAlert = async (email: string, name: string, bookTitle: string, fineAmount: number, dueDate: string) => {
    return sendEmail(TEMPLATE_CIRCULATION, {
        to_email: email,
        student_name: name,
        alert_type: 'Overdue Alert',
        message: `You have an overdue fine. Please return the book and pay the fine immediately.`,
        book_title: bookTitle,
        fine_amount: String(fineAmount),
        due_date: dueDate
    });
};

export const sendWelcomeEmail = async (email: string, name: string) => {
    return sendEmail(TEMPLATE_WELCOME, {
        to_email: email,
        student_email: email,
        student_name: name,
    });
};
