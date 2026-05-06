import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

type BottomNavProps = {
  active: 'home' | 'washing' | 'party' | 'profile' | 'chat';
  onHomePress?: () => void;
  onWashingPress?: () => void;
  onPartyPress?: () => void;
  onProfilePress?: () => void;
  onChatPress?: () => void;
};

export function BottomNav({
  active,
  onHomePress,
  onWashingPress,
  onPartyPress,
  onProfilePress,
  onChatPress,
}: BottomNavProps) {
  return (
    <View style={styles.bottomBar}>
      <Pressable style={styles.bottomItem} onPress={onChatPress}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={26}
          color={active === 'chat' ? '#111827' : '#9CA3AF'}
        />
      </Pressable>

      <Pressable style={styles.bottomItem} onPress={onHomePress}>
        <Ionicons name="home-outline" size={30} color={active === 'home' ? '#111827' : '#9CA3AF'} />
      </Pressable>

      <Pressable style={styles.bottomItem} onPress={onWashingPress}>
        <MaterialCommunityIcons
          name="washing-machine"
          size={28}
          color={active === 'washing' ? '#111827' : '#9CA3AF'}
        />
      </Pressable>

      <Pressable style={styles.bottomItem} onPress={onPartyPress}>
        <MaterialCommunityIcons
          name="party-popper"
          size={26}
          color={active === 'party' ? '#111827' : '#9CA3AF'}
        />
      </Pressable>

      <Pressable style={styles.bottomItem} onPress={onProfilePress}>
        <Ionicons name="person" size={28} color={active === 'profile' ? '#111827' : '#9CA3AF'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  bottomItem: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
