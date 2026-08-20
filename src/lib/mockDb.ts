export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'member' | 'alumni' | 'partner';
  avatar: string;
  phone: string;
  department: string;
  programCohort: string;
  skills: string[];
  interests: string[];
  points: number;
  streak: number;
  badges: string[];
  joinedDate: string;
  birthday?: string; // MM-DD format e.g. '06-24'
}

export interface AppNotification {
  id: string;
  type: 'message' | 'birthday' | 'event' | 'welfare' | 'system';
  title: string;
  body: string;
  avatar?: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  category: 'program' | 'workshop' | 'hackathon' | 'social' | 'governance';
  rsvpCount: number;
  maxCapacity: number;
  isRsvped: boolean;
  qrCodeHash: string;
  checkedInUsers: string[]; // List of user IDs
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  content: string;
  image?: string;
  likes: number;
  likedBy: string[]; // User IDs
  bookmarks: number;
  bookmarkedBy: string[]; // User IDs
  comments: Comment[];
  shares: number;
  tags: string[];
  isPinned?: boolean;
  timestamp: string;
  createdAt?: string;
}

export interface WelfareRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'welfare' | 'suggestion';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  date: string;
}

export interface Complaint {
  id: string;
  trackingCode: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  date: string;
}

// Initial Mock Datasets
export const initialProfiles: UserProfile[] = [
  {
    id: 'user-sarah',
    name: 'Sarah Jenkins',
    email: 'sarah.j@renaissancelabs.org',
    role: 'member',
    avatar: '/avatars/sarah.png',
    phone: '+234 812 345 6789',
    department: 'AI Lab',
    programCohort: 'AI Cohort 2026',
    skills: ['Python', 'TensorFlow', 'Data Science', 'Machine Learning'],
    interests: ['AI Research', 'Robotics', 'Ethical AI', 'EdTech'],
    points: 340,
    streak: 12,
    badges: ['AI Pioneer', 'Streak Master', 'Top Contributor'],
    joinedDate: 'Jan 2026',
    birthday: '07-02'
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena.r@renaissancelabs.org',
    role: 'admin',
    avatar: '/avatars/elena.png',
    phone: '+234 803 987 6543',
    department: 'Software Engineering',
    programCohort: 'Lab Lead / Incubator 2025',
    skills: ['Next.js', 'TypeScript', 'Node.js', 'System Architecture'],
    interests: ['Startups', 'Product Management', 'Tech Policy', 'Mentorship'],
    points: 980,
    streak: 45,
    badges: ['Community Builder', 'Innovator Badge', 'Founding Member'],
    joinedDate: 'Jun 2019',
    birthday: '06-29'
  },
  {
    id: 'user-david-m',
    name: 'David Miller',
    email: 'david.m@renaissancelabs.org',
    role: 'staff',
    avatar: '/avatars/david_m.png',
    phone: '+234 701 234 5678',
    department: 'Hardware Innovation',
    programCohort: 'IoT Lab Specialist',
    skills: ['Arduino', 'Embedded Systems', 'PCB Design', '3D Printing'],
    interests: ['IoT', 'Smart Homes', 'Clean Energy', 'DIY Electronics'],
    points: 520,
    streak: 22,
    badges: ['Maker Badge', 'Lab Warden', 'Hardware Guru'],
    joinedDate: 'Mar 2023',
    birthday: '08-10'
  },
  {
    id: 'user-david-w',
    name: 'David Wilson',
    email: 'david.w@renaissancelabs.org',
    role: 'alumni',
    avatar: '/avatars/david_w.png',
    phone: '+1 214 555 0199',
    department: 'Entrepreneurship',
    programCohort: 'Incubatee Cohort A',
    skills: ['Venture Capital', 'Business Strategy', 'Pitching', 'SaaS Growth'],
    interests: ['FinTech', 'SaaS', 'Angel Investing', 'Dallas Tech Ecosystem'],
    points: 210,
    streak: 0,
    badges: ['Alumni Star', 'Venture Pioneer'],
    joinedDate: 'Oct 2020',
    birthday: '06-25'
  },
  {
    id: 'user-maya',
    name: 'Maya Patterson',
    email: 'maya.p@renaissancelabs.org',
    role: 'member',
    avatar: '/avatars/maya.png',
    phone: '+234 815 444 8888',
    department: 'Software Engineering',
    programCohort: 'Fullstack Bootcamp 2025',
    skills: ['React', 'CSS Flexbox/Grid', 'Tailwind', 'UI/UX Design'],
    interests: ['Frontend Dev', 'Aesthetic Design', 'Web accessibility', 'Digital Art'],
    points: 415,
    streak: 18,
    badges: ['CSS Wizard', 'Streak Master', 'Helping Hand'],
    joinedDate: 'Sep 2025',
    birthday: '06-24' // Today! Demo birthday for auto-post
  },
  {
    id: 'user-marcus',
    name: 'Marcus Obi',
    email: 'marcus.o@renaissancelabs.org',
    role: 'member',
    avatar: '/avatars/marcus.png',
    phone: '+234 802 111 2233',
    department: 'Hardware Innovation',
    programCohort: 'IoT Lab Cohort 2025',
    skills: ['Arduino', 'Python', 'IoT Sensors', 'Raspberry Pi'],
    interests: ['Smart Agriculture', 'Renewable Energy', 'Embedded Systems'],
    points: 175,
    streak: 5,
    badges: ['New Builder'],
    joinedDate: 'Jan 2025',
    birthday: '12-15'
  }
];

export const initialEvents: Event[] = [
  {
    id: 'event-bootcamp-grad',
    title: 'Fullstack Bootcamp Graduation Ceremony',
    description: 'Celebrating the graduation of the class of 2025! Come see the amazing capstone project presentations in software engineering, embedded systems, and tech business models.',
    location: 'RIL Innovation Hall, Port Harcourt Hub',
    date: '2026-06-12',
    time: '14:00 - 18:00',
    category: 'program',
    rsvpCount: 42,
    maxCapacity: 60,
    isRsvped: false,
    qrCodeHash: 'qr_ril_bootcamp_grad_2026',
    checkedInUsers: []
  },
  {
    id: 'event-ai-summit',
    title: 'RIL AI Research Summit 2026',
    description: 'A 2-day technical summit bringing AI practitioners, machine learning engineers, and researchers together from Dallas and Nigeria to discuss edge-computing, LLM tuning, and robotics.',
    location: 'Hybrid (RIL Dallas Hub & Zoom)',
    date: '2026-05-30',
    time: '10:00 - 16:00',
    category: 'workshop',
    rsvpCount: 88,
    maxCapacity: 150,
    isRsvped: true,
    qrCodeHash: 'qr_ril_ai_summit_2026',
    checkedInUsers: ['user-sarah']
  },
  {
    id: 'event-hackathon',
    title: 'Port Harcourt Smart City IoT Hackathon',
    description: '36 hours of hacking! Design and build physical hardware solutions answering waste disposal, traffic congestion, and local solar-energy grid distribution problems.',
    location: 'IoT Sandbox & Lab, Port Harcourt',
    date: '2026-06-25',
    time: '08:00 (Fri) - 20:00 (Sat)',
    category: 'hackathon',
    rsvpCount: 25,
    maxCapacity: 40,
    isRsvped: false,
    qrCodeHash: 'qr_ril_iot_hackathon_2026',
    checkedInUsers: []
  },
  {
    id: 'event-monthly-mingle',
    title: 'RIL Community Hangout & Games Night',
    description: 'Unwind and connect! An evening of console games, board games, local finger food, networking, and celebrating monthly birthdays across the RIL Family.',
    location: 'Courtyard Terrace, Port Harcourt Hub',
    date: '2026-05-29',
    time: '17:00 - 21:00',
    category: 'social',
    rsvpCount: 55,
    maxCapacity: 75,
    isRsvped: false,
    qrCodeHash: 'qr_ril_mingle_may_2026',
    checkedInUsers: []
  }
];

export const initialPosts: Post[] = [
  {
    id: 'post-1',
    authorId: 'user-elena',
    authorName: 'Elena Rostova',
    authorAvatar: '/avatars/elena.png',
    authorRole: 'Lab Lead | Admin',
    content: 'Welcome back to the RIL Hub, everyone! 🚀 Exciting updates coming up this month as we expand our hardware sandbox and prepare for the IoT Hackathon. The new 3D printers are fully calibrated and ready for use in the IoT Sandbox. Reach out to David Miller for scheduling training sessions!',
    image: '/assets/dashboard_preview.png',
    likes: 24,
    likedBy: ['user-sarah', 'user-david-m'],
    bookmarks: 5,
    bookmarkedBy: ['user-sarah'],
    comments: [
      {
        id: 'comment-1-1',
        authorName: 'David Miller',
        authorAvatar: '/avatars/david_m.png',
        content: 'Spot on! The hardware workspace has been expanded. We have two new filament styles in stock too. Let\'s build!',
        timestamp: '2 hours ago'
      },
      {
        id: 'comment-1-2',
        authorName: 'Sarah Jenkins',
        authorAvatar: '/avatars/sarah.png',
        content: 'Super excited for this! Planning to mock up some robotic arm enclosures.',
        timestamp: '1 hour ago'
      }
    ],
    shares: 4,
    tags: ['CommunityUpdate', 'IoTSandbox', 'HardwareLab'],
    isPinned: true,
    timestamp: '3 hours ago'
  },
  {
    id: 'post-2',
    authorId: 'user-sarah',
    authorName: 'Sarah Jenkins',
    authorAvatar: '/avatars/sarah.png',
    authorRole: 'AI Lab Fellow',
    content: 'Finished fine-tuning my first custom LLM on regional agricultural data today! The goal is to build an offline advisory voice assistant for local farmers. The model runs smoothly on edge devices now! Big thanks to the AI Lab cohort and Elena for the compute cluster resources. 🌾🤖',
    likes: 38,
    likedBy: ['user-elena', 'user-david-m', 'user-maya'],
    bookmarks: 8,
    bookmarkedBy: ['user-elena', 'user-maya'],
    comments: [
      {
        id: 'comment-2-1',
        authorName: 'Elena Rostova',
        authorAvatar: '/avatars/elena.png',
        content: 'This is brilliant, Sarah! Groundbreaking research that directly helps local agricultural systems. Let\'s prepare this for a spotlight presentation at the AI Summit!',
        timestamp: '4 hours ago'
      },
      {
        id: 'comment-2-2',
        authorName: 'David Wilson',
        authorAvatar: '/avatars/david_w.png',
        content: 'Incredible work. This has massive commercial potential for agri-tech startups. Let\'s chat soon about investor pitch readiness!',
        timestamp: '3 hours ago'
      }
    ],
    shares: 7,
    tags: ['MachineLearning', 'AgriTech', 'EdgeAI', 'Impact'],
    timestamp: '5 hours ago'
  },
  {
    id: 'post-3',
    authorId: 'user-david-w',
    authorName: 'David Wilson',
    authorAvatar: '/avatars/david_w.png',
    authorRole: 'Incubator Alumni',
    content: 'Greeting RIL Family from Dallas! Great seeing the Port Harcourt ecosystem thriving. If any startup founder in the cohort is working on SaaS scaling or preparing for venture funding, I am running open mentoring slots on Zoom this Thursday. Feel free to book a slot!',
    likes: 15,
    likedBy: ['user-elena', 'user-maya'],
    bookmarks: 3,
    bookmarkedBy: [],
    comments: [],
    shares: 2,
    tags: ['Mentoring', 'VentureCapital', 'AlumniNetwork', 'StartupScale'],
    timestamp: '1 day ago'
  }
];

export const initialWelfare: WelfareRequest[] = [
  {
    id: 'welfare-1',
    userId: 'user-sarah',
    userName: 'Sarah Jenkins',
    type: 'welfare',
    title: 'Compute power subsidy request for agricultural AI project',
    content: 'I require temporary access to additional GPU compute hours (approx 20 hours on H100) to complete the training run for our offline advisory assistant model before the AI Summit.',
    priority: 'high',
    status: 'in_progress',
    date: '2026-05-26'
  },
  {
    id: 'welfare-2',
    userId: 'user-maya',
    userName: 'Maya Patterson',
    type: 'suggestion',
    title: 'More standing desks in the coworking space',
    content: 'It would be fantastic if we could add 2-3 ergonomic standing desks in the main open coworking room. It would really help with ergonomics during long coding stretches!',
    priority: 'low',
    status: 'open',
    date: '2026-05-27'
  }
];

export const initialComplaints: Complaint[] = [
  {
    id: 'complaint-1',
    trackingCode: 'COMP-77A9',
    title: 'Coworking space temperature too cold',
    content: 'The air conditioning in the main computer lab is constantly set extremely low, making it difficult to work for long hours without winter clothing. Suggest adjusting it to 23-24°C.',
    priority: 'medium',
    status: 'open',
    date: '2026-05-27'
  }
];
