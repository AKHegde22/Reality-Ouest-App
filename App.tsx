import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DialogueBox } from "./src/components/DialogueBox";
import { PrimaryButton } from "./src/components/PrimaryButton";
import { QuestCard } from "./src/components/QuestCard";
import { StatPill } from "./src/components/StatPill";
import { useGameState } from "./src/hooks/useGameState";
import { colors } from "./src/theme/colors";
import { AttributeKey } from "./src/types/game";

type SourceMode = "camera" | "library";
type CaptureTarget = "before" | "after";

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: "Strength",
  intellect: "Intellect",
  charisma: "Charisma",
  willpower: "Willpower",
};

export default function App(): JSX.Element {
  const {
    ready,
    player,
    xpToNextLevel,
    dialogue,
    busyLabel,
    beforeImageUri,
    afterImageUri,
    scanResult,
    activeQuest,
    verificationResult,
    setBeforeImage,
    setAfterImage,
    analyzeScene,
    acceptQuest,
    submitQuest,
    resetRun,
  } = useGameState();

  const isBusy = Boolean(busyLabel);

  const handleImageInput = async (source: SourceMode, target: CaptureTarget): Promise<void> => {
    if (isBusy) {
      return;
    }

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", `Please allow ${source} access to continue.`);
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    if (target === "before") {
      setBeforeImage(result.assets[0].uri);
      return;
    }

    setAfterImage(result.assets[0].uri);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Reality RPG</Text>
          <Text style={styles.subtitle}>
            Transform real-world mess into quests, XP, and story progression.
          </Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatPill label="Level" value={`${player.level}`} />
            <StatPill label="XP Bank" value={`${player.currentXp}`} />
            <StatPill label="Gold" value={`${player.gold}`} />
          </View>
          <Text style={styles.nextLevelText}>XP to next level: {xpToNextLevel}</Text>
          <View style={styles.attributesGrid}>
            {(Object.keys(player.attributes) as AttributeKey[]).map((key) => (
              <View style={styles.attributeChip} key={key}>
                <Text style={styles.attributeLabel}>{ATTRIBUTE_LABELS[key]}</Text>
                <Text style={styles.attributeValue}>{player.attributes[key]}</Text>
              </View>
            ))}
          </View>
        </View>

        <DialogueBox text={dialogue} />

        {!ready ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loaderText}>Loading hero profile...</Text>
          </View>
        ) : null}

        {busyLabel ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loaderText}>{busyLabel}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Spirit Lens</Text>
          {!beforeImageUri ? (
            <View style={styles.block}>
              <Text style={styles.blockText}>
                Capture a room photo to spawn quests from real-world chaos.
              </Text>
              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="Capture Mess"
                  onPress={() => {
                    void handleImageInput("camera", "before");
                  }}
                  style={styles.halfButton}
                  disabled={isBusy}
                />
                <PrimaryButton
                  label="Choose Photo"
                  onPress={() => {
                    void handleImageInput("library", "before");
                  }}
                  variant="muted"
                  style={styles.halfButton}
                  disabled={isBusy}
                />
              </View>
            </View>
          ) : (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>Before</Text>
              <Image source={{ uri: beforeImageUri }} style={styles.previewImage} />
              {!scanResult && !activeQuest ? (
                <View style={styles.buttonColumn}>
                  <PrimaryButton
                    label="Analyze Scene"
                    onPress={() => {
                      void analyzeScene();
                    }}
                    disabled={isBusy}
                  />
                  <PrimaryButton
                    label="Retake Before Photo"
                    onPress={() => {
                      void handleImageInput("camera", "before");
                    }}
                    variant="muted"
                    disabled={isBusy}
                  />
                  <PrimaryButton
                    label="Reset Run"
                    onPress={resetRun}
                    variant="danger"
                    disabled={isBusy}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {scanResult && !activeQuest ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Generated Quests</Text>
            <View style={styles.questList}>
              {scanResult.quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onPress={() => {
                    acceptQuest(quest);
                  }}
                  disabled={isBusy}
                />
              ))}
            </View>
          </View>
        ) : null}

        {activeQuest ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Active Quest</Text>
            <QuestCard quest={activeQuest} actionLabel="Locked In" disabled />

            <View style={styles.block}>
              <Text style={styles.blockLabel}>After</Text>
              {afterImageUri ? (
                <Image source={{ uri: afterImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.afterPlaceholder}>
                  <Text style={styles.placeholderText}>Capture a clean-room proof shot.</Text>
                </View>
              )}
              <View style={styles.buttonRow}>
                <PrimaryButton
                  label="Capture After"
                  onPress={() => {
                    void handleImageInput("camera", "after");
                  }}
                  style={styles.halfButton}
                  disabled={isBusy}
                />
                <PrimaryButton
                  label="Choose After"
                  onPress={() => {
                    void handleImageInput("library", "after");
                  }}
                  variant="muted"
                  style={styles.halfButton}
                  disabled={isBusy}
                />
              </View>
              <PrimaryButton
                label="Verify Quest Completion"
                onPress={() => {
                  void submitQuest();
                }}
                disabled={isBusy || !afterImageUri}
              />
              <PrimaryButton
                label="Abort Quest"
                onPress={resetRun}
                variant="danger"
                disabled={isBusy}
              />
            </View>

            {verificationResult ? (
              <View
                style={[
                  styles.verificationBox,
                  verificationResult.success ? styles.verificationSuccess : styles.verificationFailure,
                ]}
              >
                <Text style={styles.verificationText}>{verificationResult.message}</Text>
                <Text style={styles.verificationMeta}>
                  Confidence: {Math.round(verificationResult.confidence * 100)}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Guilds (Next Slice)</Text>
          <Text style={styles.blockText}>
            Raid creation, household invites, and contribution tracking are scoped for the next MVP milestone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  statsSection: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  nextLevelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: -2,
  },
  attributesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attributeChip: {
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
  },
  attributeLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  attributeValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  loaderCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loaderText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  block: {
    gap: 10,
  },
  blockLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  blockText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  previewImage: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonColumn: {
    gap: 8,
  },
  halfButton: {
    flex: 1,
  },
  questList: {
    gap: 10,
  },
  afterPlaceholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  placeholderText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  verificationBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  verificationSuccess: {
    backgroundColor: "rgba(31, 87, 63, 0.45)",
    borderColor: colors.success,
  },
  verificationFailure: {
    backgroundColor: "rgba(88, 37, 42, 0.5)",
    borderColor: colors.danger,
  },
  verificationText: {
    color: colors.textPrimary,
    fontWeight: "700",
    lineHeight: 20,
  },
  verificationMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
