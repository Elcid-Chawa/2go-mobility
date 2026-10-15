import React, { useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthUser, DriverOnboarding, OnboardingDocumentKind, VehicleCategory, getDriverOnboarding, saveDriverOnboardingDraft, submitDriverOnboarding, uploadDriverOnboardingFile } from "../api";

type Draft = Pick<DriverOnboarding, "personalInfo" | "address" | "vehicleInfo" | "documents">;

const emptyDraft = (user: AuthUser): Draft => {
  const [firstName = "", ...rest] = user.name.split(" ");
  return {
    personalInfo: {
      firstName,
      lastName: rest.join(" "),
      phoneNumber: user.phone,
      idDocumentType: "NATIONAL_ID",
    },
    address: { country: "Rwanda" },
    vehicleInfo: { category: "STANDARD" },
    documents: {},
  };
};

const documentLabels: Array<{ key: OnboardingDocumentKind; label: string; required: boolean }> = [
  { key: "profilePhoto", label: "Profile photo", required: true },
  { key: "vehiclePreviewImage", label: "Vehicle preview photo", required: true },
  { key: "idDocument", label: "National ID or passport", required: true },
  { key: "drivingLicense", label: "Driving licence", required: true },
  { key: "vehicleRegistration", label: "Vehicle registration / vignette", required: true },
  { key: "insuranceCertificate", label: "Insurance certificate", required: false },
];

const categories: VehicleCategory[] = ["STANDARD", "COMFORT", "PREMIUM", "XL"];

export function DriverOnboardingScreen({
  user,
  onApplicationChanged,
}: {
  user: AuthUser;
  onApplicationChanged: (application: DriverOnboarding) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(user));
  const [application, setApplication] = useState<DriverOnboarding | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<OnboardingDocumentKind | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getDriverOnboarding()
      .then((result) => {
        const initial = emptyDraft(user);
        const value: Draft = {
          personalInfo: { ...initial.personalInfo, ...result.personalInfo },
          address: { ...initial.address, ...result.address },
          vehicleInfo: { ...initial.vehicleInfo, ...result.vehicleInfo },
          documents: { ...result.documents },
        };
        setDraft(value);
        setApplication(result);
        onApplicationChanged(result);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load driver onboarding.");
      })
      .finally(() => setLoading(false));
  }, [user, onApplicationChanged]);

  function updatePersonal(key: keyof Draft["personalInfo"], value: string) {
    setDraft((current) => ({
      ...current,
      personalInfo: { ...current.personalInfo, [key]: value },
    }));
  }

  function updateAddress(key: keyof Draft["address"], value: string) {
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  }

  function updateVehicle(key: keyof Draft["vehicleInfo"], value: string) {
    setDraft((current) => ({
      ...current,
      vehicleInfo: {
        ...current.vehicleInfo,
        [key]: key === "year" ? (value ? Number(value) : undefined) : value,
      },
    }));
  }

  async function refresh() {
    setError("");
    try {
      const result = await getDriverOnboarding();
      setApplication(result);
      onApplicationChanged(result);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh your application.");
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await saveDriverOnboardingDraft(draft);
      setApplication(result);
      onApplicationChanged(result);
      setNotice("Your progress has been saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your application.");
    } finally {
      setSaving(false);
    }
  }

  async function chooseDocument(kind: OnboardingDocumentKind) {
    setError("");
    setNotice("");
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setUploading(kind);
    try {
      const file = picked.assets[0];
      const updated = await uploadDriverOnboardingFile(kind, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        file: file.file,
      });
      setDraft((current) => ({
        ...current,
        documents: { ...current.documents, [kind]: updated.documents[kind] },
      }));
      setApplication(updated);
      onApplicationChanged(updated);
      setNotice(`${documentLabels.find((item) => item.key === kind)?.label} uploaded.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload that file.");
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveDriverOnboardingDraft(draft);
      const result = await submitDriverOnboarding();
      setApplication(result);
      onApplicationChanged(result);
      setNotice("Application submitted. Operations will review your details.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your application.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00d4ed" />
        <Text style={styles.muted}>Preparing your driver application…</Text>
      </View>
    );
  }

  const isWaiting =
    application?.onboardingStatus === "COMPLETED" &&
    application.verificationStatus === "VERIFICATION_IN_PROGRESS";

  if (application?.verificationStatus === "VERIFIED") {
    return (
      <View style={styles.center}>
        <Text style={styles.kicker}>DRIVER ACCOUNT ACTIVE</Text>
        <Text style={styles.title}>You’re ready to drive</Text>
        <Text style={styles.muted}>Your documents and vehicle have been approved.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onApplicationChanged(application)}>
          <Text style={styles.primaryText}>Continue to driver app</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isWaiting) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.panel}>
          <Text style={styles.kicker}>APPLICATION RECEIVED</Text>
          <Text style={styles.title}>Operations is reviewing your details</Text>
          <Text style={styles.muted}>You’ll be able to go online and receive trips after your driver profile and vehicle are approved.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={refresh}>
            <Text style={styles.secondaryText}>Refresh application status</Text>
          </TouchableOpacity>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text style={styles.kicker}>2GO DRIVER PARTNER</Text>
          <Text style={styles.title}>Complete your driver profile</Text>
          <Text style={styles.muted}>We’ll review your identity, licence and vehicle before activating your driver account.</Text>

          <View style={styles.steps}>
            {["Personal", "Address", "Vehicle", "Documents"].map((label, index) => (
              <TouchableOpacity
                key={label}
                onPress={() => setStep(index)}
                style={[styles.step, step === index && styles.activeStep]}
              >
                <Text style={[styles.stepText, step === index && styles.activeStepText]}>{index + 1}. {label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {step === 0 && (
            <>
              <Field label="First name" value={draft.personalInfo.firstName} onChangeText={(value) => updatePersonal("firstName", value)} />
              <Field label="Last name" value={draft.personalInfo.lastName} onChangeText={(value) => updatePersonal("lastName", value)} />
              <Field label="Date of birth (YYYY-MM-DD)" value={dateInput(draft.personalInfo.dateOfBirth)} onChangeText={(value) => updatePersonal("dateOfBirth", value)} />
              <Field label="Phone number" value={draft.personalInfo.phoneNumber} onChangeText={(value) => updatePersonal("phoneNumber", value)} keyboardType="phone-pad" />
              <Field label="ID type" value={draft.personalInfo.idDocumentType} onChangeText={(value) => updatePersonal("idDocumentType", value)} />
              <Field label="ID number" value={draft.personalInfo.idDocumentNumber} onChangeText={(value) => updatePersonal("idDocumentNumber", value)} />
              <Field label="Driving licence number" value={draft.personalInfo.drivingLicenseNumber} onChangeText={(value) => updatePersonal("drivingLicenseNumber", value)} />
              <Field label="Licence expiry (YYYY-MM-DD, optional)" value={dateInput(draft.personalInfo.drivingLicenseExpiryDate)} onChangeText={(value) => updatePersonal("drivingLicenseExpiryDate", value)} />
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Street / address" value={draft.address.street} onChangeText={(value) => updateAddress("street", value)} />
              <Field label="City" value={draft.address.city} onChangeText={(value) => updateAddress("city", value)} />
              <Field label="District / state" value={draft.address.state} onChangeText={(value) => updateAddress("state", value)} />
              <Field label="Postal code (optional)" value={draft.address.zipCode} onChangeText={(value) => updateAddress("zipCode", value)} />
              <Field label="Country" value={draft.address.country} onChangeText={(value) => updateAddress("country", value)} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Vehicle make" value={draft.vehicleInfo.make} onChangeText={(value) => updateVehicle("make", value)} />
              <Field label="Vehicle model" value={draft.vehicleInfo.model} onChangeText={(value) => updateVehicle("model", value)} />
              <Field label="Year" value={draft.vehicleInfo.year ? String(draft.vehicleInfo.year) : ""} onChangeText={(value) => updateVehicle("year", value)} keyboardType="numeric" />
              <Field label="Color" value={draft.vehicleInfo.color} onChangeText={(value) => updateVehicle("color", value)} />
              <Field label="Registration number / plate" value={draft.vehicleInfo.licensePlate} onChangeText={(value) => updateVehicle("licensePlate", value)} />
              <Field label="VIN / chassis number" value={draft.vehicleInfo.vin} onChangeText={(value) => updateVehicle("vin", value)} />
              <Text style={styles.fieldLabel}>Ride category</Text>
              <View style={styles.categoryRow}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => updateVehicle("category", category)}
                    style={[styles.category, draft.vehicleInfo.category === category && styles.categoryActive]}
                  >
                    <Text style={styles.categoryText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.muted}>Choose a clear, readable image or PDF for each required item. Maximum file size is 10 MB.</Text>
              {documentLabels.map((item) => {
                const picked = draft.documents[item.key];
                return (
                  <View key={item.key} style={styles.uploadRow}>
                    <View style={styles.uploadCopy}>
                      <Text style={styles.uploadLabel}>{item.label}{item.required ? " *" : ""}</Text>
                      <Text style={styles.uploadStatus}>{picked ? "Uploaded" : "Required before submission"}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => void chooseDocument(item.key)}
                      disabled={uploading !== null}
                    >
                      {uploading === item.key ? <ActivityIndicator color="#00d4ed" /> : <Text style={styles.uploadButtonText}>{picked ? "Replace" : "Choose"}</Text>}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          <View style={styles.actions}>
            {step > 0 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((current) => current - 1)}>
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep((current) => current + 1)}>
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={() => void submit()} disabled={saving || uploading !== null}>
                {saving ? <ActivityIndicator color="#071015" /> : <Text style={styles.primaryText}>Submit for review</Text>}
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={() => void saveDraft()} disabled={saving || uploading !== null}>
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save progress"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value || ""}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#718198"
        keyboardType={keyboardType || "default"}
        autoCapitalize="sentences"
      />
    </View>
  );
}

function dateInput(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0e1519" },
  center: { flex: 1, backgroundColor: "#0e1519", alignItems: "center", justifyContent: "center", padding: 24 },
  page: { flexGrow: 1, backgroundColor: "#0e1519", padding: 16, justifyContent: "center" },
  panel: { backgroundColor: "#151e24", borderColor: "#26343c", borderWidth: 1, borderRadius: 20, padding: 20, marginVertical: 12 },
  kicker: { color: "#00d4ed", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#f5fafb", fontSize: 24, fontWeight: "900", marginTop: 8 },
  muted: { color: "#a9b9be", fontSize: 13, lineHeight: 20, marginTop: 8 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20, marginBottom: 8 },
  step: { borderWidth: 1, borderColor: "#35434a", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10 },
  activeStep: { borderColor: "#00d4ed", backgroundColor: "#07313a" },
  stepText: { color: "#a9b9be", fontSize: 11, fontWeight: "700" },
  activeStepText: { color: "#00d4ed" },
  field: { marginTop: 12 },
  fieldLabel: { color: "#c8d4d7", fontWeight: "700", fontSize: 12, marginBottom: 6 },
  input: { color: "#f5fafb", backgroundColor: "#0d1418", borderColor: "#34434a", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: { borderWidth: 1, borderColor: "#35434a", borderRadius: 9, padding: 9 },
  categoryActive: { backgroundColor: "#07313a", borderColor: "#00d4ed" },
  categoryText: { color: "#e5eff1", fontSize: 11, fontWeight: "700" },
  uploadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#2b373d", paddingVertical: 13, gap: 10 },
  uploadCopy: { flex: 1 },
  uploadLabel: { color: "#eef6f7", fontSize: 13, fontWeight: "800" },
  uploadStatus: { color: "#92a1a9", fontSize: 11, marginTop: 4 },
  uploadButton: { minWidth: 76, alignItems: "center", borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: "#0d1418", borderWidth: 1, borderColor: "#3c5158" },
  uploadButtonText: { color: "#00d4ed", fontWeight: "800", fontSize: 12 },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 20 },
  primaryButton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 11, backgroundColor: "#00d4ed", paddingHorizontal: 16, marginTop: 18 },
  primaryText: { color: "#071015", fontSize: 13, fontWeight: "900" },
  secondaryButton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 11, borderColor: "#42535a", borderWidth: 1, paddingHorizontal: 16, marginTop: 18 },
  secondaryText: { color: "#dce8ea", fontSize: 13, fontWeight: "800" },
  saveButton: { alignItems: "center", padding: 12, marginTop: 4 },
  saveText: { color: "#a9b9be", fontSize: 12, fontWeight: "700" },
  error: { color: "#ff9e9e", marginTop: 12, fontSize: 12 },
  notice: { color: "#72e7b0", marginTop: 12, fontSize: 12 },
});
