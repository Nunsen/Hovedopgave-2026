import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView } from 'react-native';

import {
  initialPostForm,
  PostFormScreen,
  type PostFieldErrors,
  type PostForm,
} from '@/components/posts/post-form-screen';
import { useAuth } from '@/context/AuthContext';
import { getPost, updatePost } from '@/lib/api';

export default function EditPostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { user, isLoading } = useAuth();

  const [initialValues, setInitialValues] = useState<PostForm>(initialPostForm);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const resolvedPostId = useMemo(() => Number(postId), [postId]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const loadPost = useCallback(async () => {
    if (!user || Number.isNaN(resolvedPostId)) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setGeneralError(null);

    const result = await getPost(resolvedPostId, user.userId);

    if (result.error || !result.data) {
      Alert.alert('Kunne ikke hente opslag', result.error ?? 'Opslaget kunne ikke indlaeses.');
      router.back();
      return;
    }

    if (result.data.userId !== user.userId) {
      Alert.alert('Ingen adgang', 'Kun forfatteren kan redigere opslaget.');
      router.back();
      return;
    }

    setInitialValues({
      title: result.data.title,
      eventDate: result.data.eventDate ?? '',
      startTime: result.data.startTime ?? '',
      endTime: result.data.endTime ?? '',
      location: result.data.location ?? '',
      category: result.data.category as PostForm['category'],
      content: result.data.content,
      icon: result.data.icon,
      pinned: result.data.pinned,
    });
    setIsFetching(false);
  }, [resolvedPostId, router, user]);

  useFocusEffect(
    useCallback(() => {
      loadPost();
    }, [loadPost]),
  );

  const handleSubmit = async (
    form: PostForm,
  ): Promise<{ fieldErrors?: PostFieldErrors; message?: string } | void> => {
    if (!user || Number.isNaN(resolvedPostId)) {
      return { message: 'Log ind igen for at redigere opslaget.' };
    }

    setGeneralError(null);
    setIsSubmitting(true);

    const result = await updatePost(resolvedPostId, {
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

    router.back();
  };

  if (isLoading || isFetching) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!user || Number.isNaN(resolvedPostId)) {
    return null;
  }

  return (
    <PostFormScreen
      title="Rediger opslag"
      submitLabel="Gem ændringer"
      submitIcon="edit-2"
      initialValues={initialValues}
      isSubmitting={isSubmitting}
      generalError={generalError}
      submitErrorTitle="Kunne ikke gemme ændringer"
      submitErrorMessage="Log ind igen for at redigere opslaget."
      onSubmit={handleSubmit}
      onBack={() => router.back()}
      onHomePress={() => router.replace('/home')}
      onProfilePress={() => router.push('/profile')}
    />
  );
}
