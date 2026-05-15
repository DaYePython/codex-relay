import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/ui/text";
import { Colors, Fonts, Spacing } from "@/constants/theme";

type AppToastAction = {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  pendingLabel?: string;
  onPress: () => void;
};

type AppToastProps = {
  action?: AppToastAction;
  durationMs?: number;
  message?: string;
  title: string;
  visible: boolean;
  onDismiss: () => void;
};

const defaultToastVisibleMs = 5600;
const toastAnimationMs = 220;
const toastBottomOffset = 64;
const toastMinBottom = 84;

export function AppToast({
  action,
  durationMs = defaultToastVisibleMs,
  message,
  title,
  visible,
  onDismiss,
}: AppToastProps) {
  const [isMounted, setMounted] = useState(visible);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const visibleRef = useRef(visible);
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(visible ? 1 : 0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  }, []);

  const finishHideToast = useCallback(() => {
    if (!visibleRef.current) {
      setMounted(false);
    }
  }, []);

  useEffect(() => {
    visibleRef.current = visible;
    clearHideTimer();

    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: toastAnimationMs,
        easing: Easing.out(Easing.cubic),
      });
      if (durationMs > 0) {
        hideTimerRef.current = setTimeout(onDismiss, durationMs);
      }
      return clearHideTimer;
    }

    progress.value = withTiming(
      0,
      {
        duration: toastAnimationMs,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishHideToast)();
        }
      },
    );
    return clearHideTimer;
  }, [clearHideTimer, durationMs, finishHideToast, onDismiss, progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 18 }],
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.toastHost,
          {
            bottom: Math.max(insets.bottom + toastBottomOffset, toastMinBottom),
          },
          animatedStyle,
        ]}
      >
        <View style={styles.toast}>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {message ? (
              <Text numberOfLines={2} style={styles.message}>
                {message}
              </Text>
            ) : null}
          </View>
          {action ? (
            <Pressable
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              disabled={action.disabled}
              hitSlop={10}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.action,
                pressed && !action.disabled && styles.actionPressed,
                action.disabled && styles.actionDisabled,
              ]}
            >
              <Text style={styles.actionText}>
                {action.disabled && action.pendingLabel ? action.pendingLabel : action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastHost: {
    left: Spacing.three,
    position: "absolute",
    right: Spacing.three,
  },
  toast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#303232",
    borderColor: "rgba(255, 255, 255, 0.26)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    maxWidth: 520,
    minHeight: 58,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    width: "100%",
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  message: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  action: {
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 82,
    paddingHorizontal: 12,
  },
  actionPressed: {
    opacity: 0.82,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionText: {
    color: "#191919",
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
