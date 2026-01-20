export const DEPARTMENTS = [
    'CSE',
    'ECE',
    'CE',
    'ME',
    'AIML',
    'MBA',
    'PHD-ME'
] as const;

export type Department = typeof DEPARTMENTS[number];

export const BRANCH_TO_DEPARTMENT: Record<string, string> = {
    'CSE': 'CSE',
    'ECE': 'ECE',
    'CE': 'CE',
    'ME': 'ME',
    'AIML': 'AIML',
    'MBA': 'MBA',
    'PHD-ME': 'PHD-ME'
};
