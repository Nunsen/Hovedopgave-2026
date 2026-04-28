import Constants from 'expo-constants';

type DashboardData = {
  users: Array<{
    userId: number;
    firstName: string;
    lastName: string;
    apartmentNumber: string;
    role: string;
  }>;
  facilities: Array<{
    facilityId: number;
    name: string;
    type: string;
    status: string;
  }>;
  bookings: Array<{
    bookingId: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    user: {
      firstName: string;
      lastName: string;
      apartmentNumber: string;
    };
    facility: {
      name: string;
    };
  }>;
  posts: Array<{
    postId: number;
    title: string;
    content: string;
    isImportant: boolean;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
  groups: Array<{
    groupId: number;
    name: string;
    description: string;
    type: string;
    createdAt: string;
  }>;
  faqs: Array<{
    faqId: number;
    question: string;
    answer: string;
    category: string;
  }>;
};

const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'http://localhost:8080/api';

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${apiBaseUrl}/dashboard`);
  if (!response.ok) {
    throw new Error(`Dashboard request failed with status ${response.status}`);
  }
  return response.json();
}

export { apiBaseUrl };
