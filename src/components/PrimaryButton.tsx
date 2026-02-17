import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type ButtonVariant = "solid" | "muted" | "danger";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  solid: {
    backgroundColor: colors.accentStrong,
  },
  muted: {
    backgroundColor: colors.bgSoft,
  },
  danger: {
    backgroundColor: "#8f3f4a",
  },
};

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  style,
  variant = "solid",
}: PrimaryButtonProps): JSX.Element => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      variantStyles[variant],
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
      style,
    ]}
  >
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
