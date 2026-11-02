import mongoose from 'mongoose';
import { ENV } from './config/env';
import { User } from './models/User';

const sampleEducation = [
  {
    id: 'edu_1',
    institution: 'Kongu Engineering College',
    degree: 'B.E.',
    fieldOfStudy: 'Computer Science & Engineering',
    startYear: '2021',
    endYear: '2025',
    grade: '8.85 CGPA',
    description: 'Specialized in Full Stack Development, Cloud Computing, and Mobile Systems.'
  },
  {
    id: 'edu_2',
    institution: 'Bharathi Vidya Bhavan Higher Secondary School',
    degree: 'HSC (+2)',
    fieldOfStudy: 'Computer Science & Mathematics',
    startYear: '2019',
    endYear: '2021',
    grade: '94.6%',
    description: 'First class distinction in Mathematics, Physics, and Computer Science.'
  }
];

const sampleExperience = [
  {
    id: 'exp_1',
    title: 'Campus Peer Mentor & Lead',
    company: 'PeerBridge Student Network',
    location: 'Perundurai, Erode',
    startDate: '2023',
    endDate: 'Present',
    description: 'Leading peer tutoring sessions for 40+ students in Mobile Architecture, React Native, and Data Structures.'
  },
  {
    id: 'exp_2',
    title: 'Mobile App Developer Intern',
    company: 'Kaizen Infinities Labs',
    location: 'Remote',
    startDate: '2024',
    endDate: 'Present',
    description: 'Developing high-performance cross-platform features, RESTful APIs, and offline storage models.'
  }
];

const sampleProjects = [
  {
    id: 'proj_1',
    title: 'PeerBridge Mobile Platform',
    tag: 'React Native & Node.js',
    description: 'Campus collaboration, tutor discovery & peer study note sharing app.',
    link: 'https://github.com/peerbridge/mobile',
    stars: 577,
    collaborators: 4,
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'proj_2',
    title: 'AI Study Assistant & Smart Quiz Engine',
    tag: 'TypeScript & Python',
    description: 'Interactive flashcard generator, practice tests, and automated performance analytics.',
    link: 'https://github.com/peerbridge/ai-quiz',
    stars: 412,
    collaborators: 2,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'proj_3',
    title: 'Campus Question Bank & Curated Notes',
    tag: 'UI/UX & MongoDB',
    description: 'Cloud-synced semester lecture notes and previous years solved university papers.',
    link: 'https://github.com/peerbridge/notes-bank',
    stars: 389,
    collaborators: 6,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
  }
];

const sampleSkills = [
  'React Native',
  'TypeScript',
  'UI/UX Design',
  'Python',
  'Node.js',
  'MongoDB',
  'Data Structures'
];

async function seedProfiles() {
  try {
    console.log('[Seed Profiles] Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('[Seed Profiles] Connected successfully.');

    const users = await User.find({});
    console.log(`[Seed Profiles] Found ${users.length} total users in database.`);

    for (const user of users) {
      console.log(`[Seed Profiles] Updating profile for: ${user.name} (${user.email})...`);
      
      user.userType = user.userType || 'student';
      user.headline = user.headline && user.headline !== 'Student & Peer Tutor'
        ? user.headline
        : 'Pre-Final Year CSE Student | Peer Tutor & Mobile Developer';

      user.college = user.college || 'Kongu Engineering College';
      user.department = user.department || 'Computer Science & Engineering';
      user.yearOfStudy = user.yearOfStudy || 3;
      user.semester = user.semester || 6;
      user.studentId = user.studentId || '21CSR078';
      user.campusLocation = user.campusLocation || 'Perundurai, Erode';
      user.bio = user.bio || 'Passionate student & peer tutor eager to collaborate, share lecture notes, and help peers ace their semester.';

      user.education = sampleEducation;
      user.experience = sampleExperience;
      user.projects = sampleProjects;
      user.skills = sampleSkills;

      await user.save();
      console.log(`[Seed Profiles] ✓ User ${user.email} successfully seeded with Education, Experience, Projects & Skills!`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL USER PROFILES SUCCESSFULLY SEEDED WITH RICH DATA!');
    console.log('======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Profiles Error]:', error);
    process.exit(1);
  }
}

seedProfiles();
