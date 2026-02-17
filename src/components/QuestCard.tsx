import { Pressable, StyleSheet, Text, View } from "react-native";
import { Quest } from "../types/game";
import { colors } from "../theme/colors";

interface QuestCardProps {
  quest: Quest;
  actionLabel?: string;
  disabled?: boolean;
  onPress?: () => void;
}

export const QuestCard = ({
  quest,
  actionLabel = "Accept Quest",
  disabled = false,
  onPress,
}: QuestCardProps): JSX.Element => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{quest.title}</Text>
      <Text style={styles.confidence}>{Math.round(quest.confidence * 100)}%</Text>
    </View>
    <Text style={styles.monster}>Target: {quest.monsterName}</Text>
    <Text style={styles.flavor}>{quest.flavor}</Text>
    <View style={styles.metaRow}>
      <Text style={styles.meta}>~{quest.estimateMinutes} min</Text>
      <Text style={styles.meta}>+{quest.xpReward} XP</Text>
      <Text style={styles.meta}>
        +{quest.attributeDelta} {quest.attributeReward}
      </Text>
    </View>
    {onPress ? (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonLabel}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  confidence: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  monster: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  flavor: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    textAlign: "center",
    color: colors.textPrimary,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
