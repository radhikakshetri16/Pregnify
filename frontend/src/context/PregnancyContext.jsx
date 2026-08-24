import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const PregnancyContext = createContext(null);

const API_BASE_URL = "/api";

export const PregnancyProvider = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useAuth();
  const userId = user?.id || "guest";

  const getStorageKey = (key) => `pregnify_${userId}_${key}`;

  const defaultProfile = {
    lmpDate: "2026-02-09",
    bloodPressure: "118/78",
    height: "165",
    weight: "62.5",
    heartRate: "76",
    bloodGroup: "O+",
    pregnancyType: "Single",
    doctorName: "Dr. Sharma",
    appointmentDate: "2026-08-25",
    appointmentTime: "10:00 AM",
    appointmentType: "Regular ANC Checkup",
    isProfileComplete: false,
    symptoms: "Mild nausea, fatigue",
    notes: "Daily hydration and prenatal vitamins taken.",
  };

  const [profile, setProfile] = useState(defaultProfile);
  const [healthLogs, setHealthLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId && userId !== "guest") {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Fetch Profile from Backend
          const resProfile = await fetch(`${API_BASE_URL}/profile?userId=${encodeURIComponent(userId)}`);
          if (resProfile.ok) {
            const data = await resProfile.json();
            if (data.found && data.profile) {
              setProfile((prev) => ({
                ...prev,
                ...data.profile,
                name: user?.fullName || data.profile.name,
                email: user?.email || data.profile.email,
              }));
              setShowOnboarding(!data.profile.isProfileComplete);
            } else {
              const cached = localStorage.getItem(getStorageKey("profile"));
              if (cached) {
                const parsed = JSON.parse(cached);
                setProfile(parsed);
                setShowOnboarding(!parsed.isProfileComplete);
              } else {
                setShowOnboarding(true);
              }
            }
          }

          // Fetch Health Logs
          const resLogs = await fetch(`${API_BASE_URL}/health/logs?userId=${encodeURIComponent(userId)}`);
          if (resLogs.ok) {
            const logsData = await resLogs.json();
            if (logsData.logs && logsData.logs.length > 0) {
              setHealthLogs(logsData.logs);
            }
          }

          // Fetch Appointments
          const resApp = await fetch(`${API_BASE_URL}/appointments?userId=${encodeURIComponent(userId)}`);
          if (resApp.ok) {
            const appData = await resApp.json();
            if (appData.appointments) {
              setAppointments(appData.appointments);
            }
          }
        } catch (err) {
          console.warn("Backend API offline or fallback to cache:", err);
          const cached = localStorage.getItem(getStorageKey("profile"));
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setProfile(parsed);
              setShowOnboarding(!parsed.isProfileComplete);
            } catch {
              setShowOnboarding(true);
            }
          } else {
            setShowOnboarding(true);
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isLoaded, isSignedIn, userId, user]);

  const saveProfile = async (newProfileData) => {
    const updated = {
      ...profile,
      ...newProfileData,
      isProfileComplete: true,
      name: user?.fullName || profile.name,
      email: user?.email || profile.email,
      updatedAt: new Date().toISOString(),
    };

    setProfile(updated);
    setShowOnboarding(false);

    if (userId) {
      localStorage.setItem(getStorageKey("profile"), JSON.stringify(updated));
    }

    try {
      await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: user?.fullName || updated.name,
          email: user?.email || updated.email,
          bloodPressure: updated.bloodPressure,
          height: updated.height,
          weight: updated.weight,
          heartRate: updated.heartRate,
          bloodGroup: updated.bloodGroup,
          pregnancyType: updated.pregnancyType,
          doctorName: updated.doctorName,
          lmpDate: updated.lmpDate,
          appointmentDate: updated.appointmentDate,
          appointmentTime: updated.appointmentTime,
          appointmentType: updated.appointmentType,
        }),
      });
    } catch (err) {
      console.error("Failed to save profile to backend:", err);
    }
  };

  const addHealthRecord = async (record) => {
    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      timestamp: new Date().toISOString(),
      ...record,
    };

    const updatedLogs = [newRecord, ...healthLogs];
    setHealthLogs(updatedLogs);

    const updatedProfile = {
      ...profile,
      weight: record.weight || profile.weight,
      bloodPressure: record.bloodPressure || profile.bloodPressure,
      heartRate: record.heartRate || profile.heartRate,
      symptoms: record.symptoms || profile.symptoms,
      notes: record.notes || profile.notes,
      updatedAt: new Date().toISOString(),
    };

    setProfile(updatedProfile);

    if (userId) {
      localStorage.setItem(getStorageKey("health_logs"), JSON.stringify(updatedLogs));
      localStorage.setItem(getStorageKey("profile"), JSON.stringify(updatedProfile));
    }

    try {
      await fetch(`${API_BASE_URL}/health/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          weight: record.weight,
          bloodPressure: record.bloodPressure,
          heartRate: record.heartRate,
          symptoms: record.symptoms,
          notes: record.notes,
          date: newRecord.date,
        }),
      });
    } catch (err) {
      console.error("Failed to save health record to backend:", err);
    }
  };

  const calculateGestationalInfo = () => {
    if (!profile.lmpDate) {
      return {
        weeks: 0,
        days: 0,
        totalDays: 0,
        dueDateFormatted: "Not set",
        daysRemaining: 0,
        trimester: "1st Trimester",
        progressPercent: 0,
      };
    }

    const lmp = new Date(profile.lmpDate);
    const today = new Date();

    const diffTime = today.getTime() - lmp.getTime();
    const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    const dueDate = new Date(lmp);
    dueDate.setDate(dueDate.getDate() + 280);

    const dueDateFormatted = dueDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const diffDueTime = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffDueTime / (1000 * 60 * 60 * 24)));

    let trimester = "1st Trimester";
    if (weeks >= 28) {
      trimester = "3rd Trimester";
    } else if (weeks >= 14) {
      trimester = "2nd Trimester";
    }

    const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / 280) * 100)));

    return {
      weeks,
      days,
      totalDays,
      dueDateFormatted,
      daysRemaining,
      trimester,
      progressPercent,
    };
  };

  const calculateBMI = () => {
    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height);
    if (!w || !h || h <= 0) return null;
    const heightInMeters = h / 100;
    return (w / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const gestationalInfo = calculateGestationalInfo();
  const bmi = calculateBMI();

  return (
    <PregnancyContext.Provider
      value={{
        profile,
        healthLogs,
        appointments,
        saveProfile,
        addHealthRecord,
        showOnboarding,
        setShowOnboarding,
        isLoading,
        gestationalInfo,
        bmi,
      }}
    >
      {children}
    </PregnancyContext.Provider>
  );
};

export const usePregnancy = () => {
  const context = useContext(PregnancyContext);
  if (!context) {
    throw new Error("usePregnancy must be used within a PregnancyProvider");
  }
  return context;
};
