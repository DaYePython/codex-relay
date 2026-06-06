import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { ThemedText } from "@/components/themed-text";
import { Icon } from "@/components/ui/icon";
import { Colors, Spacing } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

import {
  activePlanProgressStep,
  type TimelinePlanProgress,
  type TimelinePlanProgressStepStatus,
} from "./plan-progress";

export function PlanProgressBanner({ progress }: { progress?: TimelinePlanProgress }) {
  const [isExpanded, setExpanded] = useState(false);

  if (!progress) {
    return null;
  }

  const completedStepCount = progress.steps.filter((step) => step.status === "completed").length;
  const stepCount = progress.steps.length;
  const activeStep = activePlanProgressStep(progress);

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      layout={planProgressLayoutTransition}
      style={styles.bannerHost}
    >
      <Pressable
        accessibilityLabel={`Plan progress: ${completedStepCount} of ${stepCount} steps completed`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityValue={{ max: stepCount, min: 0, now: completedStepCount }}
        onPress={() => {
          hapticSelection();
          setExpanded((current) => !current);
        }}
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryMarkerSlot}>
            {activeStep ? <PlanProgressMarker status={activeStep.status} /> : null}
          </View>
          <View style={styles.titleGroup}>
            <ThemedText type="code" style={styles.label}>
              Plan
            </ThemedText>
            <ThemedText type="small" numberOfLines={1} style={styles.summaryText}>
              {activeStep ? activeStep.text : "Updating plan"}
            </ThemedText>
          </View>
          <View style={styles.trailingGroup}>
            <ThemedText type="code" style={styles.countText}>
              {completedStepCount}/{stepCount}
            </ThemedText>
            <Icon
              name={isExpanded ? "expand" : "chevronRight"}
              size={16}
              tintColor={Colors.dark.textSecondary}
            />
          </View>
        </View>
      </Pressable>

      {isExpanded ? (
        <Animated.View entering={FadeIn.duration(120)} style={styles.expandedPanel}>
          {progress.steps.map((step) => (
            <View
              key={step.id}
              accessible
              accessibilityLabel={`${planProgressStatusLabel(step.status)}: ${step.text}`}
              style={styles.stepRow}
            >
              <PlanProgressMarker status={step.status} />
              <ThemedText
                numberOfLines={2}
                type="small"
                style={[styles.stepText, step.status === "pending" && styles.stepTextPending]}
              >
                {step.text}
              </ThemedText>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function planProgressStatusLabel(status: TimelinePlanProgressStepStatus) {
  switch (status) {
    case "completed":
      return "Completed";
    case "inProgress":
      return "In progress";
    case "pending":
      return "Pending";
  }
}

function PlanProgressMarker({ status }: { status: TimelinePlanProgressStepStatus }) {
  const rotation = useSharedValue(0);
  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    if (status !== "inProgress") {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(withTiming(360, { duration: 900 }), -1, false);
  }, [rotation, status]);

  if (status === "completed") {
    return (
      <View style={[styles.marker, styles.markerCompleted]}>
        <Icon name="check" size={8} tintColor="#151515" strokeWidth={3} />
      </View>
    );
  }

  if (status === "inProgress") {
    return (
      <View style={[styles.marker, styles.markerActive]}>
        <Animated.View style={spinnerStyle}>
          <Icon name="running" size={9} tintColor="#151515" strokeWidth={2.8} />
        </Animated.View>
      </View>
    );
  }

  return <View style={[styles.marker, styles.markerPending]} />;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(42, 42, 42, 0.92)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bannerHost: {
    elevation: 20,
    marginBottom: Spacing.two,
    marginHorizontal: Spacing.four,
    position: "relative",
    zIndex: 20,
  },
  bannerPressed: {
    opacity: 0.78,
  },
  countText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
  expandedPanel: {
    backgroundColor: "rgba(42, 42, 42, 0.96)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    elevation: 20,
    gap: Spacing.one,
    left: 0,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    position: "absolute",
    right: 0,
    top: "100%",
    zIndex: 20,
  },
  label: {
    color: "#9B8BD4",
    fontSize: 12,
    lineHeight: 16,
  },
  marker: {
    alignItems: "center",
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    marginTop: 1,
    width: 14,
  },
  markerActive: {
    backgroundColor: "#9B8BD4",
  },
  markerCompleted: {
    backgroundColor: "#8FD19E",
  },
  markerPending: {
    borderColor: "rgba(176, 180, 186, 0.42)",
    borderWidth: 1,
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 22,
  },
  steps: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  stepText: {
    color: Colors.dark.text,
    flex: 1,
    lineHeight: 18,
  },
  stepTextPending: {
    color: Colors.dark.textSecondary,
  },
  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  summaryMarkerSlot: {
    paddingTop: 20,
    width: 14,
  },
  summaryText: {
    color: Colors.dark.text,
    lineHeight: 20,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  trailingGroup: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
});

const planProgressLayoutTransition = LinearTransition.duration(160);
