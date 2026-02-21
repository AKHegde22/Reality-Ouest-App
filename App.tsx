import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { DialogueBox } from "./src/components/DialogueBox";
import { PrimaryButton } from "./src/components/PrimaryButton";
import { QuestCard } from "./src/components/QuestCard";
import { StatPill } from "./src/components/StatPill";
import { useGameState } from "./src/hooks/useGameState";
import { colors } from "./src/theme/colors";
import { AttributeKey, HeroClass } from "./src/types/game";

type SourceMode = "camera" | "library";
type CaptureTarget = "before" | "after";

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: "Strength",
  intellect: "Intellect",
  charisma: "Charisma",
  willpower: "Willpower",
};

const HERO_CLASSES: HeroClass[] = ["Cleaner", "Organizer", "Chef"];

export default function App(): JSX.Element {
  const {
    ready,
    player,
    guild,
    guildDamageTotal,
    xpToNextLevel,
    dialogue,
    visionMode,
    busyLabel,
    beforeImage,
    afterImage,
    scanResult,
    activeQuest,
    verificationResult,
    setHeroClass,
    startGuildRaid,
    renameGuildName,
    setBeforeImage,
    setAfterImage,
    analyzeScene,
    acceptQuest,
    submitQuest,
    resetRun,
  } = useGameState();

  const isBusy = Boolean(busyLabel);
  const [guildNameDraft, setGuildNameDraft] = useState(guild.guildName);

  useEffect(() => {
    setGuildNameDraft(guild.guildName);
  }, [guild.guildName]);

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
            base64: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            base64: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

    const asset = result.canceled ? undefined : result.assets[0];
    if (result.canceled || !asset?.uri || !asset.base64) {
      if (!result.canceled) {
        Alert.alert("Image error", "Could not read image data. Please try another photo.");
      }
      return;
    }

    const capturedImage = {
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType ?? "image/jpeg",
    };

    if (target === "before") {
      setBeforeImage(capturedImage);
      return;
    }

    setAfterImage(capturedImage);
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
          <Text style={styles.nextLevelText}>
            Vision mode:{" "}
            {visionMode === "cerebras"
              ? "Cerebras AI"
              : visionMode === "mock"
                ? "Fallback (mock)"
                : "Not scanned yet"}
          </Text>
          <Text style={styles.nextLevelText}>Class: {player.className}</Text>
          <Text style={styles.nextLevelText}>Story chapter: {player.chapter}</Text>
          <Text style={styles.nextLevelText}>Quests completed: {player.questsCompleted}</Text>
          <View style={styles.buttonRow}>
            {HERO_CLASSES.map((className) => (
              <PrimaryButton
                key={className}
                label={className}
                onPress={() => {
                  setHeroClass(className);
                }}
                variant={player.className === className ? "solid" : "muted"}
                style={styles.halfButton}
                disabled={isBusy}
              />
            ))}
          </View>
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
          {!beforeImage ? (
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
              <Image source={{ uri: beforeImage.uri }} style={styles.previewImage} />
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
              {afterImage ? (
                <Image source={{ uri: afterImage.uri }} style={styles.previewImage} />
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
                disabled={isBusy || !afterImage}
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
          <Text style={styles.sectionTitle}>Guild Command</Text>
          <Text style={styles.blockText}>Guild: {guild.guildName}</Text>
          <Text style={styles.blockText}>Hero raid damage: {guildDamageTotal}</Text>
          <View style={styles.buttonRow}>
            <TextInput
              value={guildNameDraft}
              onChangeText={setGuildNameDraft}
              placeholder="Guild name"
              placeholderTextColor={colors.textSecondary}
              style={styles.guildInput}
            />
            <PrimaryButton
              label="Save"
              onPress={() => {
                renameGuildName(guildNameDraft);
              }}
              variant="muted"
              style={styles.guildSaveButton}
              disabled={isBusy}
            />
          </View>
          {guild.activeRaid ? (
            <View style={styles.raidCard}>
              <Text style={styles.blockLabel}>Active Raid</Text>
              <Text style={styles.raidTitle}>{guild.activeRaid.title}</Text>
              <Text style={styles.blockText}>
                Boss HP: {guild.activeRaid.currentHp} / {guild.activeRaid.maxHp}
              </Text>
              <View style={styles.raidHpTrack}>
                <View
                  style={[
                    styles.raidHpFill,
                    {
                      width: `${Math.max(
                        Math.round((guild.activeRaid.currentHp / guild.activeRaid.maxHp) * 100),
                        0,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.blockText}>
                Contributions: {guild.activeRaid.contributions.length}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonColumn}>
              <Text style={styles.blockText}>
                No active raid. Start one and each completed quest will deal boss damage.
              </Text>
              <PrimaryButton
                label="Start Guild Raid"
                onPress={startGuildRaid}
                disabled={isBusy}
              />
            </View>
          )}
          {guild.raidHistory.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>Recent Victories</Text>
              {guild.raidHistory.slice(0, 3).map((raid) => (
                <Text key={raid.id} style={styles.blockText}>
                  {raid.bossName} defeated ({raid.contributions.length} hits)
                </Text>
              ))}
            </View>
          ) : null}
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
  guildInput: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontWeight: "600",
  },
  guildSaveButton: {
    width: 84,
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
  raidCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    padding: 10,
    gap: 6,
  },
  raidTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  raidHpTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    overflow: "hidden",
  },
  raidHpFill: {
    height: "100%",
    backgroundColor: colors.accentStrong,
  },
});
