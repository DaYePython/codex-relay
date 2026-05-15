import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";
import { StyleSheet } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

import { Icon, type AppIconName } from "./icon";
import { Text } from "./text";

const KEYBOARD_DISMISS_PRESENT_FALLBACK_MS = 360;

export function AppBottomSheet({
  children,
  androidKeyboardInputMode = "adjustResize",
  enableDynamicSizing = true,
  enableBlurKeyboardOnGesture = true,
  expandedSnapPercent: expandedSnapPercentOverride,
  initialSnapIndex = 0,
  keyboardBehavior = "interactive",
  keyboardBlurBehavior = "restore",
  onClose,
  scrollable = true,
  subtitle,
  title,
  visible,
}: {
  androidKeyboardInputMode?: "adjustPan" | "adjustResize";
  children: ReactNode;
  enableDynamicSizing?: boolean;
  enableBlurKeyboardOnGesture?: boolean;
  expandedSnapPercent?: number;
  initialSnapIndex?: number;
  keyboardBehavior?: "interactive" | "extend" | "fillParent";
  keyboardBlurBehavior?: "none" | "restore";
  onClose: () => void;
  scrollable?: boolean;
  subtitle?: string;
  title: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const presentFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(undefined);
  const [isMounted, setMounted] = useState(visible);
  const shouldRenderSheet = visible || isMounted;
  const maxSheetHeight = expandedSnapPercentOverride
    ? Math.max(280, windowHeight * (expandedSnapPercentOverride / 100))
    : Math.max(280, Math.min(windowHeight * 0.94, windowHeight - insets.top - 6));
  const expandedSnapPercent =
    expandedSnapPercentOverride ?? Math.max(48, Math.round((maxSheetHeight / windowHeight) * 100));
  const collapsedSnapPercent = Math.min(48, Math.max(32, expandedSnapPercent - 18));
  const snapPoints = useMemo(
    () =>
      collapsedSnapPercent === expandedSnapPercent
        ? [`${expandedSnapPercent}%`]
        : [`${collapsedSnapPercent}%`, `${expandedSnapPercent}%`],
    [collapsedSnapPercent, expandedSnapPercent],
  );
  const clampedInitialSnapIndex = Math.min(initialSnapIndex, snapPoints.length - 1);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    if (!isMounted) {
      return;
    }

    dismissKeyboard();
    sheetRef.current?.dismiss();
  }, [isMounted, visible]);

  useEffect(() => {
    if (!shouldRenderSheet || !visible) {
      return;
    }

    let didCancel = false;

    const presentSheet = () => {
      if (didCancel) {
        return;
      }
      presentFrameRef.current = requestAnimationFrame(() => {
        presentFrameRef.current = undefined;
        if (!didCancel) {
          sheetRef.current?.present();
        }
      });
    };

    void dismissKeyboardBeforePresent().finally(() => {
      presentSheet();
    });

    return () => {
      didCancel = true;
      if (presentFrameRef.current) {
        cancelAnimationFrame(presentFrameRef.current);
        presentFrameRef.current = undefined;
      }
    };
  }, [shouldRenderSheet, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.34}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleDismiss = useCallback(() => {
    dismissKeyboard();
    setMounted(false);
    if (visible) {
      onClose();
    }
  }, [onClose, visible]);

  if (!shouldRenderSheet) {
    return null;
  }

  const content = (
    <>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {children}
    </>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.background,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
      bottomInset={0}
      android_keyboardInputMode={androidKeyboardInputMode}
      enableBlurKeyboardOnGesture={enableBlurKeyboardOnGesture}
      enableDismissOnClose
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={clampedInitialSnapIndex}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      maxDynamicContentSize={maxSheetHeight}
      onDismiss={handleDismiss}
      snapPoints={snapPoints}
      style={styles.sheetContainer}
      topInset={insets.top + 6}
    >
      {scrollable ? (
        <BottomSheetScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(14, insets.bottom + 8) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView
          style={[styles.content, { paddingBottom: Math.max(14, insets.bottom + 8) }]}
        >
          {content}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

export { BottomSheetTextInput as AppBottomSheetTextInput };

async function dismissKeyboardBeforePresent() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      KeyboardController.dismiss().catch(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, KEYBOARD_DISMISS_PRESENT_FALLBACK_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function dismissKeyboard() {
  void KeyboardController.dismiss().catch(() => undefined);
}

export function SheetActionRow({
  accessibilityLabel,
  disabled,
  icon,
  iconBackgroundColor,
  iconTintColor,
  onPress,
  selected,
  selectedTitleColor,
  subtitle,
  title,
  trailing,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: AppIconName;
  iconBackgroundColor?: string;
  iconTintColor?: string;
  onPress?: () => void;
  selected?: boolean;
  selectedTitleColor?: string;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const tintColor = disabled
    ? theme.textSecondary
    : (iconTintColor ?? (selected ? theme.text : theme.textSecondary));
  const titleColor = disabled
    ? theme.textSecondary
    : selectedTitleColor && selected
      ? selectedTitleColor
      : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={
        onPress
          ? () => {
              hapticSelection();
              onPress();
            }
          : undefined
      }
      style={[
        styles.actionRow,
        selected && { backgroundColor: theme.backgroundSelected },
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          iconBackgroundColor ? { backgroundColor: iconBackgroundColor } : undefined,
        ]}
      >
        <Icon name={icon} size={18} tintColor={tintColor} />
      </View>
      <View style={styles.actionCopy}>
        <Text numberOfLines={1} style={[styles.actionTitle, { color: titleColor }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

export function SheetSelectedDot({ selected }: { selected?: boolean }) {
  return <View style={[styles.selectedDot, !selected && styles.unselectedDot]} />;
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
  },
  sheetContainer: {
    overflow: "hidden",
  },
  handle: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  handleIndicator: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    height: 4,
    width: 38,
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 15,
    lineHeight: 20,
    paddingBottom: 4,
    paddingHorizontal: 6,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.74,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  content: {
    alignSelf: "stretch",
    gap: 2,
    paddingHorizontal: 14,
  },
  actionRow: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 12,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    marginRight: 12,
    width: 32,
  },
  actionCopy: {
    alignSelf: "stretch",
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  actionSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.76,
  },
  trailing: {
    marginLeft: 12,
  },
  selectedDot: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  unselectedDot: {
    backgroundColor: "transparent",
    borderColor: "rgba(243, 244, 246, 0.32)",
    borderWidth: 1,
  },
});
