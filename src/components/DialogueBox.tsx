import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface DialogueBoxProps {
  speaker?: string;
  text: string;
}

export const DialogueBox = ({ speaker = "Spirit Guide", text }: DialogueBoxProps): JSX.Element => (
  <View style={styles.container}>
    <Text style={styles.speaker}>{speaker}</Text>
    <Text style={styles.text}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  speaker: {
    color: colors.accent,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: "700",
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
});
