import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface StatPillProps {
  label: string;
  value: string;
}

export const StatPill = ({ label, value }: StatPillProps): JSX.Element => (
  <View style={styles.pill}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
