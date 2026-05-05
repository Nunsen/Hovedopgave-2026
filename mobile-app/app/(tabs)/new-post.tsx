import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  PostFormScreen,
  type PostFieldErrors,
  type PostForm,
} from '@/components/posts/post-form-screen';
import { useAuth } from '@/context/AuthContext';
import { createPost } from '@/lib/api';

export default function NewPostScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const handleSubmit = async (
    form: PostForm,
  ): Promise<{ fieldErrors?: PostFieldErrors; message?: string } | void> => {
    if (!user) {
      return { message: 'Log ind igen for at oprette et opslag.' };
    }

    setGeneralError(null);
    setIsSubmitting(true);

    const result = await createPost({
      userId: user.userId,
      title: form.title,
      eventDate: form.category === 'Begivenhed' ? form.eventDate : '',
      startTime: form.category === 'Begivenhed' ? form.startTime : '',
      endTime: form.category === 'Begivenhed' ? form.endTime : '',
      location: form.category === 'Begivenhed' ? form.location : '',
      category: form.category,
      content: form.content,
      icon: form.icon,
      pinned: form.pinned,
    });

    setIsSubmitting(false);

    if (result.error) {
      setGeneralError(result.error.message);
      return {
        fieldErrors: result.error.fieldErrors,
        message: result.error.message,
      };
    }

    router.replace('/home');
  };

  return (
    <PostFormScreen
      title="Nyt opslag"
      submitLabel="Opret opslag"
      submitIcon="plus-square"
      isSubmitting={isSubmitting}
      generalError={generalError}
      submitErrorTitle="Kunne ikke oprette opslag"
      submitErrorMessage="Log ind igen for at oprette et opslag."
      onSubmit={handleSubmit}
      onBack={() => router.back()}
      onHomePress={() => router.replace('/home')}
      onProfilePress={() => router.push('/profile')}
    />
  );
}
