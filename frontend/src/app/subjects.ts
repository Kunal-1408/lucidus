// The subjects a Student can search for, each in its Field of study group
// (FIELDS_OF_STUDY in profile-fields.ts). Criteria name groups only, so this
// list lives in the frontend alone. A subject not listed belongs to other.
import { FieldOfStudyGroup } from './profile-fields';

export interface Subject {
  label: string;
  group: FieldOfStudyGroup;
}

export const SUBJECTS: readonly Subject[] = [
  { label: 'Aerospace engineering', group: 'engineering' },
  { label: 'Biomedical engineering', group: 'engineering' },
  { label: 'Chemical engineering', group: 'engineering' },
  { label: 'Civil engineering', group: 'engineering' },
  { label: 'Electrical engineering', group: 'engineering' },
  { label: 'Electronics and communication engineering', group: 'engineering' },
  { label: 'Marine engineering', group: 'engineering' },
  { label: 'Mechanical engineering', group: 'engineering' },
  { label: 'Metallurgical engineering', group: 'engineering' },

  { label: 'Medicine (MBBS)', group: 'medicine' },
  { label: 'Dentistry', group: 'medicine' },
  { label: 'Nursing', group: 'medicine' },
  { label: 'Pharmacy', group: 'medicine' },
  { label: 'Physiotherapy', group: 'medicine' },
  { label: 'Public health', group: 'medicine' },
  { label: 'Ayurveda', group: 'medicine' },
  { label: 'Veterinary science', group: 'medicine' },

  { label: 'Astronomy', group: 'science' },
  { label: 'Biology', group: 'science' },
  { label: 'Biotechnology', group: 'science' },
  { label: 'Chemistry', group: 'science' },
  { label: 'Environmental science', group: 'science' },
  { label: 'Geology', group: 'science' },
  { label: 'Marine biology', group: 'science' },
  { label: 'Mathematics', group: 'science' },
  { label: 'Physics', group: 'science' },
  { label: 'Statistics', group: 'science' },

  { label: 'Artificial intelligence', group: 'computing' },
  { label: 'Computer science', group: 'computing' },
  { label: 'Cybersecurity', group: 'computing' },
  { label: 'Data science', group: 'computing' },
  { label: 'Information technology', group: 'computing' },
  { label: 'Software engineering', group: 'computing' },

  { label: 'Accounting', group: 'commerce' },
  { label: 'Business administration', group: 'commerce' },
  { label: 'Chartered accountancy', group: 'commerce' },
  { label: 'Finance', group: 'commerce' },
  { label: 'Hotel management', group: 'commerce' },
  { label: 'Marketing', group: 'commerce' },

  { label: 'Law', group: 'law' },
  { label: 'Integrated law (BA LLB)', group: 'law' },

  { label: 'English literature', group: 'arts' },
  { label: 'Fine arts', group: 'arts' },
  { label: 'History', group: 'arts' },
  { label: 'Journalism and mass communication', group: 'arts' },
  { label: 'Languages', group: 'arts' },
  { label: 'Music', group: 'arts' },
  { label: 'Performing arts', group: 'arts' },
  { label: 'Philosophy', group: 'arts' },

  { label: 'Economics', group: 'social_sciences' },
  { label: 'Geography', group: 'social_sciences' },
  { label: 'International relations', group: 'social_sciences' },
  { label: 'Political science', group: 'social_sciences' },
  { label: 'Psychology', group: 'social_sciences' },
  { label: 'Sociology', group: 'social_sciences' },

  { label: 'Architecture', group: 'design' },
  { label: 'Fashion design', group: 'design' },
  { label: 'Graphic design', group: 'design' },
  { label: 'Interior design', group: 'design' },
  { label: 'Product design', group: 'design' },

  { label: 'Agriculture', group: 'agriculture' },
  { label: 'Dairy technology', group: 'agriculture' },
  { label: 'Fisheries science', group: 'agriculture' },
  { label: 'Food technology', group: 'agriculture' },
  { label: 'Forestry', group: 'agriculture' },
  { label: 'Horticulture', group: 'agriculture' },

  { label: 'Education (teacher training)', group: 'education' },
  { label: 'Physical education', group: 'education' },
  { label: 'Special education', group: 'education' },
];
