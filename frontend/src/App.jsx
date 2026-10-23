
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Trophy,
  Users,
  BookOpen,
  User,
  UserRound,
  Settings,
  LogOut,
  Bell,
  Sun,
  Search,
Rocket,
ShoppingBag,
ArrowLeftRight,
Code2,
Palette,
Database,
Shield,
Map,
Megaphone,
  Clock3,
  CheckCircle2,
  Plus,
  ChevronDown,
  X,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  MessageCircle,
  MoreVertical,
  Send,
  Flag,
  AlertTriangle,
  Upload,
  FileImage,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Star,
  CircleHelp,
} from "lucide-react";

import { upload as imageKitUpload } from "@imagekit/javascript";

import "./App.css";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  runTransaction,
  query,
  where,
  updateDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

const COLLEGE_EMAIL_DOMAIN = "@citchennai.net";


const StyledSelect = ({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  name = "",
  required = false,
  placeholder = "",
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : option
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const displayValue = selectedOption?.label || value || placeholder || "Select";

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const preferredMaxHeight = Math.min(300, Math.max(160, window.innerHeight * 0.42));

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward =
      spaceBelow < Math.min(preferredMaxHeight, 220) && spaceAbove > spaceBelow;

    const maxHeight = Math.max(
      120,
      Math.min(preferredMaxHeight, openUpward ? spaceAbove - gap : spaceBelow - gap)
    );

    const width = Math.min(
      Math.max(rect.width, 150),
      window.innerWidth - viewportPadding * 2
    );

    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - width - viewportPadding)
    );

    setMenuStyle({
      "--dropdown-left": `${left}px`,
      "--dropdown-top": openUpward ? "auto" : `${rect.bottom + gap}px`,
      "--dropdown-bottom": openUpward
        ? `${window.innerHeight - rect.top + gap}px`
        : "auto",
      "--dropdown-width": `${width}px`,
      maxHeight: `${maxHeight}px`,
    });
  };

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();

    const handleOutsidePointer = (event) => {
      const insideTrigger = ref.current && ref.current.contains(event.target);
      const insideMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
      }
    };

    const handleViewportChange = () => updateMenuPosition();

    document.addEventListener("pointerdown", handleOutsidePointer);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={`styled-select ${open ? "open" : ""} ${className}`}
    >
      {name && (
        <select
          className="styled-select-native"
          name={name}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="styled-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{displayValue}</span>
        <ChevronDown size={15} />
      </button>

      {open &&
        menuStyle &&
        createPortal(
          <div
            className={`styled-select-menu styled-select-menu-portal ${
              menuStyle.top === "auto" ? "opens-upward" : ""
            }`}
            role="listbox"
            aria-label={ariaLabel}
            style={menuStyle}
            ref={menuRef}
          >
            {normalizedOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`styled-select-option ${
                  value === option.value ? "selected" : ""
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {value === option.value && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

const withTimeout = (promise, milliseconds, operationName) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() =>
        reject(
          new Error(`${operationName} timed out. Please check your Firebase configuration and try again.`)
        ),
        milliseconds
      )
    ),
  ]);
};

// =========================================================
// IMAGEKIT AUTHENTICATION
// Uses the existing Vercel ImageKit authentication endpoint.
// The browser sends the signed-in Firebase ID token; the
// ImageKit private key remains server-side on Vercel.
// =========================================================
const IMAGEKIT_AUTH_ENDPOINT =
  import.meta.env.VITE_IMAGEKIT_AUTH_URL?.trim() ||
  "https://campus-connect-khaki-kappa.vercel.app/api/imagekit-auth";

const getImageKitAuth = async (user) => {
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  let idToken = "";
  try {
    idToken = await user.getIdToken();
  } catch (error) {
    console.error("FIREBASE ID TOKEN ERROR:", error);
    throw new Error("AUTH_TOKEN_FAILED");
  }

  if (!idToken) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  try {
    const authResponse = await fetch(IMAGEKIT_AUTH_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    const contentType = authResponse.headers.get("content-type") || "";
    const responseText = await authResponse.text();
    const trimmedResponse = responseText.trim();

    if (!authResponse.ok) {
      console.error("IMAGEKIT AUTH HTTP ERROR:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        contentType,
        response: responseText.slice(0, 500),
      });
      throw new Error("IMAGEKIT_AUTH_HTTP_ERROR");
    }

    if (
      trimmedResponse.startsWith("<!doctype html") ||
      trimmedResponse.startsWith("<!DOCTYPE html") ||
      /^<html[\s>]/i.test(trimmedResponse) ||
      !contentType.toLowerCase().includes("application/json")
    ) {
      console.error("IMAGEKIT AUTH NON-JSON RESPONSE:", {
        contentType,
        endpoint: IMAGEKIT_AUTH_ENDPOINT,
        response: trimmedResponse.slice(0, 500),
      });
      throw new Error("IMAGEKIT_AUTH_INVALID_RESPONSE");
    }

    let data;
    try {
      data = JSON.parse(trimmedResponse);
    } catch (error) {
      console.error("IMAGEKIT AUTH JSON PARSE ERROR:", error);
      throw new Error("IMAGEKIT_AUTH_INVALID_RESPONSE");
    }

    const publicKey =
      (data?.publicKey ||
        import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY ||
        "").trim();

    if (!data?.token || !data?.signature || !data?.expire || !publicKey) {
      console.error("IMAGEKIT AUTH RESPONSE INVALID:", {
        hasToken: Boolean(data?.token),
        hasSignature: Boolean(data?.signature),
        hasExpire: Boolean(data?.expire),
        hasPublicKey: Boolean(publicKey),
        serverError: data?.error || "",
      });
      throw new Error("IMAGEKIT_AUTH_RESPONSE_INVALID");
    }

    return {
      token: data.token,
      signature: data.signature,
      expire: data.expire,
      publicKey,
    };
  } catch (error) {
    console.error("IMAGEKIT AUTH ERROR:", {
      message: error?.message,
      endpoint: IMAGEKIT_AUTH_ENDPOINT,
    });

    throw error;
  }
};

const isCollegeEmail = (email) => {
  const normalized = email?.toString().trim().toLowerCase();
  return Boolean(
    normalized && normalized.endsWith(COLLEGE_EMAIL_DOMAIN)
  );
};

const getCollegeEmailError = () =>
  "CampusConnect is restricted to verified CIT student email addresses ending in @citchennai.net.";

const CAMPUS_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const DEPARTMENT_OPTIONS = ["ECE", "CSE", "EEE", "EIE", "ICE", "IT", "Mechanical", "Civil", "AI & DS", "AI & ML", "Other"];

const normalizeDepartment = (value) => {
  const text = (value || "").toString().trim().toLowerCase().replace(/&/g, "and").replace(/[.,()\-]/g, " ").replace(/\s+/g, " ");
  const aliases = {
    "ece": "ECE", "electronics communication engineering": "ECE", "electronics and communication engineering": "ECE",
    "electronics communications engineering": "ECE", "electronics and communications engineering": "ECE",
    "electronics communication": "ECE", "electronics and communication": "ECE",
    "cse": "CSE", "computer science engineering": "CSE", "computer science and engineering": "CSE",
    "eee": "EEE", "electrical and electronics engineering": "EEE", "electrical electronics engineering": "EEE",
    "eie": "EIE", "electronics and instrumentation engineering": "EIE",
    "ice": "ICE", "instrumentation and control engineering": "ICE",
    "it": "IT", "information technology": "IT",
    "mechanical": "Mechanical", "mechanical engineering": "Mechanical",
    "civil": "Civil", "civil engineering": "Civil",
    "ai ds": "AI & DS", "ai and ds": "AI & DS", "artificial intelligence and data science": "AI & DS",
    "ai ml": "AI & ML", "ai and ml": "AI & ML", "artificial intelligence and machine learning": "AI & ML",
    "other": "Other"
  };
  return aliases[text] || (value || "").toString().trim();
};


const CAMPUSCONNECT_COLLEGE = "Chennai Institute of Technology";
const IDENTITY_PROFILE_VERSION = 1;

const getCITEmailIdentity = (email) => {
  const normalized = email?.toString().trim().toLowerCase();
  if (!isCollegeEmail(normalized)) return null;

  const localPart = normalized.slice(0, -COLLEGE_EMAIL_DOMAIN.length);
  const firstDotIndex = localPart.indexOf(".");
  if (firstDotIndex <= 0 || firstDotIndex >= localPart.length - 1) return null;

  const nameSequence = localPart.slice(0, firstDotIndex);
  const departmentAndBatch = localPart.slice(firstDotIndex + 1);
  const batchMatch = departmentAndBatch.match(/^([a-z]+)(\d{4})$/i);

  if (!/^[a-z0-9]+$/i.test(nameSequence) || !batchMatch) return null;

  const departmentCode = batchMatch[1].toLowerCase();
  return {
    nameSequence,
    department: normalizeDepartment(departmentCode) || departmentCode.toUpperCase(),
    batchYear: batchMatch[2],
  };
};

const formatLockedName = (value) => {
  const normalized = (value || "").toString().trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
};

const validateLockedNameFormat = (value, lockedSequence) => {
  const name = (value || "").toString();
  const expected = (lockedSequence || "").toString().trim().toLowerCase();
  const compacted = name.replace(/\s/g, "").toLowerCase();
  const spaces = (name.match(/ /g) || []).length;

  if (!expected) return { valid: false, message: "Your CIT email could not be used to determine the official name format." };
  if (!name.trim()) return { valid: false, message: "Please enter your name." };
  if (name !== name.trim()) return { valid: false, message: "Name cannot start or end with a space." };
  if (/ {2,}/.test(name)) return { valid: false, message: "Use only one space between name parts." };
  if (spaces > 3) return { valid: false, message: "You can insert a maximum of 3 spaces." };
  if (!/^[A-Za-z0-9 ]+$/.test(name)) return { valid: false, message: "Only letters and spaces are allowed in the name." };
  if (compacted !== expected) return { valid: false, message: "Only spaces may be added. The letters and their order must match your CIT email." };

  return { valid: true, canonical: formatLockedName(name) };
};

const getCurrentAcademicStartYear = () => {
  const now = new Date();
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
};

const getAcademicYearLabelFromBatch = (batchYear) => {
  const batch = Number.parseInt(batchYear, 10);
  if (!Number.isInteger(batch)) return "";

  const yearNumber = getCurrentAcademicStartYear() - batch + 1;
  if (yearNumber < 1 || yearNumber > 4) return "";

  const suffix = yearNumber === 1 ? "st" : yearNumber === 2 ? "nd" : yearNumber === 3 ? "rd" : "th";
  return `${yearNumber}${suffix} Year`;
};

const getDeveloperEmailUrl = (subject) => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    to: "campusconnect.developer@gmail.com",
    su: subject,
  });

  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
};

const getDeveloperMailtoUrl = (subject) =>
  `mailto:campusconnect.developer@gmail.com?subject=${encodeURIComponent(subject)}`;

const handleDeveloperEmailClick = (event, subject) => {
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(
    navigator.userAgent || ""
  );

  // On phones/tablets, let the native mailto handler open the installed
  // mail app (Gmail when it is the device's mail handler).
  if (isMobileDevice) {
    return;
  }

  // Keep the existing desktop behavior: open Gmail compose directly.
  event.preventDefault();
  window.open(
    getDeveloperEmailUrl(subject),
    "_blank",
    "noopener,noreferrer"
  );
};

const generateCampusConnectId = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  let value = "";
  for (const byte of bytes) {
    value += CAMPUS_ID_ALPHABET[byte % CAMPUS_ID_ALPHABET.length];
  }

  return `CC-${value}`;
};

// The Firebase Auth UID remains the guaranteed unique backend identity.
// This separate CampusConnect ID is the student-facing lookup ID. It is
// reserved in Firestore so two students cannot receive the same public ID.
const generateTeamConnectId = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  let value = "";
  for (const byte of bytes) {
    value += CAMPUS_ID_ALPHABET[byte % CAMPUS_ID_ALPHABET.length];
  }

  return `TEAM-${value}`;
};

const ensureCampusConnectId = async (user) => {
  const profileRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(profileRef);
  const existingId = profileSnap.data()?.campusConnectId;

  if (existingId) {
    return existingId;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCampusConnectId();
    const idRef = doc(db, "campusConnectIds", candidate);

    try {
      await runTransaction(db, async (transaction) => {
        const idSnap = await transaction.get(idRef);

        if (idSnap.exists()) {
          throw new Error("CAMPUS_ID_COLLISION");
        }

        transaction.set(idRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          profileRef,
          { campusConnectId: candidate },
          { merge: true }
        );
      });

      return candidate;
    } catch (error) {
      if (error?.message !== "CAMPUS_ID_COLLISION") {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique CampusConnect ID.");
};


const COMPETITION_SHEET_ID = "1FJeOaJj9fA5_KzY7m8DE5sOVczXvG7YHxplOmaKfNLA";
const COMPETITION_SHEET_NAME = "List of Competitions 26-27";
const COMPETITION_SHEET_URL = `https://docs.google.com/spreadsheets/d/${COMPETITION_SHEET_ID}/edit?usp=sharing`;

const normalizeSheetText = (value) =>
  (value ?? "").toString().trim();

const parseSheetDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = normalizeSheetText(value);
  if (!text) return null;

  // Handles Google Visualization date values such as Date(2026,9,6).
  const visualizationMatch = text.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/i);
  if (visualizationMatch) {
    const [, year, month, day] = visualizationMatch;
    const date = new Date(Number(year), Number(month), Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfLocalDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const isRegistrationActive = (competition) => {
  const deadline = parseSheetDate(competition.registrationDeadline);
  if (!deadline) return false;

  const normalizedStatus = normalizeSheetText(competition.sourceStatus).toLowerCase();
  const activeStatuses = [
    "on going",
    "ongoing",
    "open",
    "active",
    "registration open",
    "registrations open",
  ];


return (
    activeStatuses.some((status) => normalizedStatus === status) &&
    deadline >= startOfLocalDay()
  );
};

const getCompetitionDaysRemaining = (competition) => {
  const deadline = parseSheetDate(competition.registrationDeadline);
  if (!deadline) return null;

  const today = startOfLocalDay();
  const deadlineDay = startOfLocalDay(deadline);
  return Math.ceil((deadlineDay - today) / 86400000);
};

const formatOpportunityDate = (value) => {
  const date = parseSheetDate(value);
  if (!date) return "DATE TBA";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isGoogleSpreadsheetUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return (
      parsed.hostname.toLowerCase() === "docs.google.com" &&
      parsed.pathname.toLowerCase().startsWith("/spreadsheets/")
    );
  } catch {
    return false;
  }
};

const normalizeCompetitionKey = (value) =>
  normalizeSheetText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const decodeHtmlEntities = (value) => {
  if (typeof value !== "string") return "";
  if (typeof document === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const normalizeOfficialUrl = (value) => {
  if (typeof value !== "string") return "";
  const text = decodeHtmlEntities(value.trim());
  if (!text) return "";

  const candidates = [];

  for (const match of text.matchAll(/HYPERLINK\s*\(\s*["'](https?:\/\/[^"']+)["']/gi)) {
    candidates.push(match[1]);
  }

  const hrefMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  candidates.push(...hrefMatches);
  if (/^https?:\/\//i.test(text)) candidates.push(text);

  for (const rawCandidate of candidates) {
    const candidate = decodeHtmlEntities(rawCandidate).replace(/[),.;]+$/, "");
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      if (isGoogleSpreadsheetUrl(candidate)) continue;
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return "";
};

const isRealOpportunityValue = (value) => {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return Boolean(text) &&
    !/^(see source|see official source|not available|n\/a|na|tba|date tba|unknown|—|-)$/i.test(text);
};

// Detail-sheet links from the CIT Competition Dashboard for the current live
// competition set. These are used whenever the main sheet hides rich-text hrefs.
const COMPETITION_DETAIL_SHEETS = {
  openchallengeprogram30epdelhi: "https://docs.google.com/spreadsheets/d/1-UZlInmmHfNRrK2GEZPSeLqWK86Mp0U3BVy-t_p1ihk/edit?usp=sharing",
  avinya27energystartupchallenge: "https://docs.google.com/spreadsheets/d/1hA9Zq49rdGdNXEomkWeLnbh0Z4KTFN3PmtcsMDiVgY8/edit?usp=sharing",
  hppowerlab30: "https://docs.google.com/spreadsheets/d/1fLwcUKEqEVI4R5fZPJjHSONsH9mORKhviMdAAUieflo/edit?usp=sharing",
  multimodalaihackathon2026: "https://docs.google.com/spreadsheets/d/1tQBs4NpwlYxcOhLPbH0CBp0USjBlTaC5fE3nmU64jjg/edit?usp=sharing",
  sakthihackathon20: "https://docs.google.com/spreadsheets/d/1qEn4lnpNxlwsWV4ihckgQEi3Fh4YGBB2awiNcmIim_8/edit?usp=sharing",
  ictacademyyouthtalk2026: "https://docs.google.com/spreadsheets/d/1xQ-bS366BHLr2oQVB9K57GsyJODAAR1TgU9M5L7ZyBc/edit?usp=sharing",
  zephyrhackathon: "https://docs.google.com/spreadsheets/d/1Sl9QGGKYoFCQ8Pn1aPcPGF_Yt5VIYhaH3qfZCSp6Ie8/edit?usp=sharing",
  atomquest2026: "https://docs.google.com/spreadsheets/d/16xr43at5dx_CWVwOxkTL-Y_pAR51IekamSgVCszo5TQ/edit?usp=sharing",
  tataelxsiteliportseason4: "https://docs.google.com/spreadsheets/d/1BU53_Ud5ebRHal4EpbAuU5QkQayjyBVnHqILRT-2CJE/edit?usp=sharing",
  ieeagetechglobaldatasetcompetition2026: "https://docs.google.com/spreadsheets/d/1UvNR02O748zm-K7fgSeMpspvLAXrf9QUkJUt4t4Kwr4/edit?usp=sharing",
  gitaminnovationchallenge2026: "https://docs.google.com/spreadsheets/d/1whXOiMdgHX-302OuXPum2LNNqMdvKmE2os0MegZt-5s/edit?usp=sharing",
  polarfirefpgadesigncontest: "https://docs.google.com/spreadsheets/d/1QvDdUjZkVzx5MahfHMXsgyl6c2AFuErlCmShbT17aQc/edit?usp=sharing",
  northeasevafirstinnovationchallenge2026: "https://docs.google.com/spreadsheets/d/1wW3XlB-1s4SaZjOzdELuVxonSILJLKcupFYKG2rx5zs/edit?usp=sharing",
  digitaltwinchallenge2026: "https://docs.google.com/spreadsheets/d/10EizG6wV8IrZGwZaLKuP4hypa0oe4z0nODZYCZW08BE/edit?usp=sharing",
  wegeprize2027: "https://docs.google.com/spreadsheets/d/11PfwyFsS8tGH3hR49ARMqDiS2d3ZWM5BdpD61HKhCxg/edit?usp=sharing",
  caddidc2026: "https://docs.google.com/spreadsheets/d/1T4xexpkS3dxYGUwPJpNDmzg1yGxB1uJjj8XAqcbmPn0/edit?usp=sharing",
  ieeextreme200: "https://docs.google.com/spreadsheets/d/14tdoqhr7ZvL96a7UiDKkv9l12gKqNRQSdxtt3Zuo_4A/edit?usp=sharing",
  nationalprobabilitychallenge: "https://docs.google.com/spreadsheets/d/1vr62Uanlc4VivD-A89S1scM3WsPnd1xGJuH3zWCbnSY/edit?usp=sharing",
  chipthefuturechallenge: "https://docs.google.com/spreadsheets/d/1si2F9j9QryNhlHy1z0vow87I7Qh9eCitGnY9yrFf2uU/edit?usp=sharing",
  amazondeveloperhackathon: "https://docs.google.com/spreadsheets/d/19QsrVvbij2Lq4d-AF6N-MibVpWp7of7PMgdK4uPyoAw/edit?usp=sharing",
  ecocircuit: "https://docs.google.com/spreadsheets/d/1AaVxFKLmmHnjUPTwOb4d30uGvHFmQpHJebV1hXoCFDc/edit?usp=sharing",
  galuxiumnexusv2: "https://docs.google.com/spreadsheets/d/140vQe8NU2aaY-CiEC3c_abb3wlne74TlwO8_ZifcY1M/edit?usp=sharing",
  nebiusxnvidiaglobalaihackathon: "https://docs.google.com/spreadsheets/d/11LHX5NaE6ZarwZAhCVtNAaIRtaJ5so4zizkwK35WfJk/edit?usp=sharing",
  nasaspaceappschallenge: "https://docs.google.com/spreadsheets/d/1dcXmsYmNAsyYSUdfGvkypcB5SU-VsUi8O7TxyXsu9wE/edit?usp=sharing",
  hondainnovationchallenge20: "https://docs.google.com/spreadsheets/d/1D2IbOSqSbZ7GZdJwxXyxActC6EEIqcM0GE1pTX7-UbM/edit?usp=sharing",
  ieeeclimatechainglobalhackathon: "https://docs.google.com/spreadsheets/d/19Ft-ArTcTRQt9lmfWV49CQ8DjGNyGwjG-0I7RlqH8eA/edit?usp=sharing",
  gatewayhacks2026: "https://docs.google.com/spreadsheets/d/12ykNPytPpKBLbie2WPMOF7Mz4GXsCE91flCM7qi6nIs/edit?usp=sharing",
  yuvayodhaenergytechhackathon: "https://docs.google.com/spreadsheets/d/1nCbIAHC9UAdhAcedHylvORtry4iaX-2Ho1Ezw8Zfy4E/edit?usp=sharing",
  opencvaicompetition2026: "https://docs.google.com/spreadsheets/d/1YBfKmq6uxvsVW1fFfhcdJuRJLVNAib996Wvwz5GX8l0/edit?usp=sharing",
};

// Exact official competition/event URLs verified from current organizer pages.
// Verified event sources. Generic organizer/company homepages are intentionally
// excluded because they can lead to unrelated pages.
const VERIFIED_OFFICIAL_COMPETITION_DATA = {
  openchallengeprogram30epdelhi: {
    url: "https://electropreneurpark.in/open_challenge",
    overview: "Electropreneur Park's Open Challenge Program 3.0 is a Government of India-backed ESDM innovation program for startups and innovators. The program invites solutions to real-world electronics and hardware problems across areas including cognitive computing and social sensing, medtech, edutech, automotive electronics, strategic electronics, EV, defence and drones.",
  },
  avinya27energystartupchallenge: {
    url: "https://innovateindia.mygov.in/avinya27-energy-startup-challenge/",
    overview: "Avinya'27 is an energy startup competition under India Energy Week that asks startups, researchers and students to develop innovative solutions for the future energy sector. Official challenge themes include the hydrocarbon value chain, alternative fuels such as green hydrogen, low-carbon technologies, renewable energy, digital and AI/ML applications, energy efficiency and Industry 4.0.",
  },
  multimodalaihackathon2026: {
    url: "https://multimodal-ai-hackathon-2026-7.devpost.com/",
    overview: "The Multimodal AI Hackathon 2026 is a 15-day online build challenge focused on generative AI, agentic AI and real-world problem solving. The official event presents tracks spanning domains such as space, biotechnology and education, with projects submitted through Devpost.",
  },
  sakthihackathon20: {
    url: "https://hackathon.drmcet.ac.in/",
    overview: "Sakthi Hackathon 2.0 is a national inter-college hackathon organized by Dr. Mahalingam College of Engineering and Technology. The official event uses screening stages and culminates in an offline hackathon finale where participants develop solutions across technology domains.",
  },
  ictacademyyouthtalk2026: {
    url: "https://youth.ictacademy.in/Talk2026/",
    overview: "ICT Academy Youth Talk 2026 is a public-speaking competition designed to develop communication and leadership abilities among higher-education students. The official event describes progression from video screening through regional stages to a final speaking platform.",
  },
  zephyrhackathon: {
    url: "https://beta.ptuniv.edu.in/",
    overview: "ZEPHYR is presented by Puducherry Technological University as a national-level AI hackathon. The official university site describes an India-wide AI-focused challenge culminating in a grand-finale stage.",
  },
  ieeagetechglobaldatasetcompetition2026: {
    url: "https://agetech.ieee.org/competition/",
    overview: "The IEEE AgeTech Global Dataset Competition 2026 challenges participants to create and publish high-quality datasets supporting AI and healthy-longevity research. Official competition areas include health and well-being, independent living and smart environments, mobility and assistive technology, care and support, cognitive health and digital inclusion, and open innovation.",
  },
  gitaminnovationchallenge2026: {
    url: "https://gevents.gitam.edu/event_details/ODkyMg..",
    overview: "The GITAM Innovation Challenge 2026 is a national student innovation and pitching competition conducted through GITAM Venture Development Centre. The official event includes junior and main tracks and provides a platform for students to present innovative ideas and solutions before the final stages.",
  },
  atomquest2026: {
    url: "https://gradpartners.in/",
    overviewUrl: "https://www.linkedin.com/company/atomberg-technologies-private-limited/",
    overview: "atomQUEST 2026 is an Atomberg Technologies engineering innovation challenge. The official organizer announcement describes three tracks—Fan, Water Purifier and Mixer Grinder—and asks engineering students to take an idea from an initial concept to a working prototype. It also states that teams can have 1 to 5 members and that selected participants can receive mentorship and placement-related opportunities.",
  },
  polarfirefpgadesigncontest: {
    url: "https://www.microchip.com/en-us/campaigns/polarfire-fpga-design-contest",
    overview: "The PolarFire FPGA Design Contest 2026 asks engineers, students and innovators to solve a real-world problem with hardware-accelerated solutions built on PolarFire and PolarFire SoC FPGA platforms. Microchip's official problem statement calls for RTL design, embedded processing and RISC-V-based methodologies, with tracks built around the Discovery, Icicle and Splash development platforms.",
  },
  digitaltwinchallenge2026: {
    url: "https://unstop.com/hackathons/crp-digital-twin-challenge-2026-happiest-health-1757873",
    overview: "The CRP Digital Twin Challenge 2026, associated with Happiest Health, focuses on developing a proof-of-concept healthcare Digital Twin. The challenge combines historical health information with dynamic wearable or IoT time-series data to model and predict localized health outcomes.",
  },
  wegeprize2027: {
    url: "https://www.wegeprize.org/",
    overview: "Wege Prize 2027 is a global university-student design competition and learning lab built around circular-economy thinking. Teams propose products or services that address complex real-world problems and evolve their ideas through an iterative design process with feedback from judges across multiple phases.",
  },
  caddidc2026: {
    url: "https://caddcentre.com/international-design-competition-2026/",
    overview: "The CADD Centre International Design Competition 2026 presents engineering design challenges covering industrial equipment, new energy for data centres, eVTOL and drones, and last-mile mobility. The official competition progresses through digital design and modelling, simulation and feasibility work, and an advanced final-stage presentation.",
  },
  ieeextreme200: {
    url: "https://ieeextreme.org/",
    overview: "IEEEXtreme 20.0 is a global 24-hour programming competition for teams of IEEE Student members working with an IEEE member as advisor and proctor. Participants solve competitive-programming problems during the official timed event.",
  },
  nationalprobabilitychallenge: {
    url: "https://techfest.org/competitions",
    overview: "The National Probability Challenge is listed in IIT Bombay Techfest's competition portal and focuses on probability, quantitative reasoning and decision-making. The official competition description uses problem-solving rounds and decision scenarios to test reasoning under uncertainty.",
  },
  chipthefuturechallenge: {
    url: "https://semifoundation.org/chip-the-future-challenge/",
    overview: "The Chip the Future Challenge is a global student competition from the SEMI Foundation focused on real-world semiconductor innovation. Students can enter a Research Challenge or Innovation Challenge covering chip design, semiconductor manufacturing, AI hardware, advanced packaging and breakthrough applications.",
  },
  amazondeveloperhackathon: {
    url: "https://amazonappdev2026.devpost.com/",
    overview: "The Amazon Developer Hackathon invites participants to build working applications across Amazon devices and services including Fire TV, Alexa+, Ring and Bee. The official event asks participants to choose a product track, create a functioning demo and submit project materials through Devpost.",
  },
  ecocircuit: {
    url: "https://techfest.org/competitions/ecocircuit",
    overview: "EcoCircuit is a Techfest sustainability-focused hardware challenge in which participants design electronic devices that can operate during use while also being designed for safer end-of-life degradation. The competition combines circuit and product engineering with an environmental design objective.",
  },
  galuxiumnexusv2: {
    url: "https://galuxium-nexus-v2-29411.devpost.com/",
    overview: "Galuxium Nexus V2 is a student-focused online hackathon centered on building SaaS products that solve real problems and can become products users would pay for. The official event encourages next-generation AI, creator and automation tools and expects a working project demonstration.",
  },
  nebiusxnvidiaglobalaihackathon: {
    url: "https://nebiusglobalaihackathon.devpost.com/",
    overview: "The Nebius x NVIDIA Global AI Hackathon invites developers to build AI projects using open infrastructure and accelerator-enabled tooling. The official event is organized around creating and submitting working AI solutions through Devpost under its published rules and schedule.",
  },
  nasaspaceappschallenge: {
    url: "https://www.spaceappschallenge.org/2026/",
    overview: "NASA's Space Apps Challenge 2026, themed \"The Next Frontier,\" invites teams to use open data from NASA and international space-agency partners to address Earth and space challenges. Participants form teams, build a project around a published challenge and submit their solution during the official event.",
  },
  hondainnovationchallenge20: {
    url: "https://www.t-hub.co/honda-innovation-challenge-2-0",
    overview: "Honda Innovation Challenge 2.0 is a startup co-development program presented by T-Hub and Honda. The official challenge focuses on improving customer safety, loyalty and experience, including areas related to women mobility and everyday mobility, with selected startups progressing toward proof-of-concept or pilot collaboration.",
  },
  ieeeclimatechainglobalhackathon: {
    url: "https://ieee-climatechain-hack.devpost.com/",
    overview: "The IEEE ClimateChain Global Hackathon combines AI and blockchain to address climate-related problems. Official focus areas include transparent carbon markets, renewable energy, sustainable supply chains and climate data, with participants building and submitting practical technology prototypes.",
  },
  gatewayhacks2026: {
    url: "https://gatewayhacks-2026.devpost.com/",
    overview: "GatewayHacks 2026 is a four-week virtual hackathon where participants can build software, hardware or AI prototypes for social good. The official event includes themes such as accessibility and health, equity in education and open-impact projects, with projects submitted online.",
  },
  yuvayodhaenergytechhackathon: {
    url: "https://www.yuvayodhatech.com/",
    overview: "Yuva Yodha Energy Tech Hackathon is a Schneider Electric energy and sustainability challenge. Its official challenge statements address sustainable agriculture, smart buildings, grid reliability and renewable-energy intermittency, and smart manufacturing.",
  },
  opencvaicompetition2026: {
    url: "https://opencv.org/opencv-ai-competition-2026",
    overview: "The OpenCV AI Competition 2026 is a global computer-vision challenge run by OpenCV in collaboration with AWS. The official competition highlights OpenCV 5, computer vision, Physical AI, generative AI, agentic vision and cloud deployment.",
  },
};

const getKnownCompetitionUrl = (item) => {
  const key = normalizeCompetitionKey(item?.name || item?.sourceName);
  return normalizeOfficialUrl(VERIFIED_OFFICIAL_COMPETITION_DATA[key]?.url || "");
};

const getKnownCompetitionOverview = (item) => {
  const key = normalizeCompetitionKey(item?.name || item?.sourceName);
  return normalizeSheetText(VERIFIED_OFFICIAL_COMPETITION_DATA[key]?.overview || "");
};

const getKnownCompetitionOverviewSource = (item) => {
  const key = normalizeCompetitionKey(item?.name || item?.sourceName);
  return normalizeOfficialUrl(
    VERIFIED_OFFICIAL_COMPETITION_DATA[key]?.overviewUrl ||
      VERIFIED_OFFICIAL_COMPETITION_DATA[key]?.url ||
      ""
  );
};

const getCompetitionDetailSheetFallback = (item) => {
  const key = normalizeCompetitionKey(item?.name || item?.sourceName);
  return COMPETITION_DETAIL_SHEETS[key] || "";
};

const competitionDetailCache = new globalThis.Map();

const getSpreadsheetIdFromUrl = (value) => {
  if (typeof value !== "string") return "";
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || "";
};

const parseGvizHtmlRows = (html) => {
  if (typeof DOMParser === "undefined" || typeof html !== "string") return [];
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const table =
    parsed.querySelector("table.google-visualization-table-table") ||
    parsed.querySelector("table");
  if (!table) return [];

  return Array.from(table.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("th,td")).map((cell) => ({
      text: cleanDetailText(cell.textContent),
      links: Array.from(cell.querySelectorAll("a[href]"))
        .map((anchor) => decodeHtmlEntities(anchor.getAttribute("href") || ""))
        .filter(Boolean),
      html: cell.innerHTML || "",
    }))
  );
};

const fetchGvizHtml = async (spreadsheetId, sheetName = "") => {
  const params = new URLSearchParams({ tqx: "out:html" });
  if (sheetName) params.set("sheet", sheetName);
  const endpoint =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEET_HTML_HTTP_${response.status}`);
  return response.text();
};

const fetchGvizJson = async (spreadsheetId, sheetName = "") => {
  const params = new URLSearchParams({ tqx: "out:json" });
  if (sheetName) params.set("sheet", sheetName);
  const endpoint =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`GOOGLE_SHEET_JSON_HTTP_${response.status}`);
  return response.text();
};

const cleanDetailText = (value) =>
  normalizeSheetText(value)
    .replace(/^[-–—•]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const extractUrlsFromCell = (cell) => {
  if (!cell) return [];
  return [...new Set(
    [cell.text, cell.html, ...(cell.links || [])]
      .filter((value) => typeof value === "string")
      .flatMap((value) => {
        const values = [value, ...(value.match(/https?:\/\/[^\s"'<>]+/gi) || [])];
        return values.map(normalizeOfficialUrl).filter(Boolean);
      })
  )];
};

const fetchCompetitionDetailData = async (detailSheetUrl) => {
  if (!detailSheetUrl) return {};
  if (competitionDetailCache.has(detailSheetUrl)) {
    return competitionDetailCache.get(detailSheetUrl);
  }

  const spreadsheetId = getSpreadsheetIdFromUrl(detailSheetUrl);
  if (!spreadsheetId) return {};

  try {
    let htmlRows = [];
    try {
      const html = await fetchGvizHtml(spreadsheetId);
      htmlRows = parseGvizHtmlRows(html);
    } catch (htmlError) {
      console.warn("DETAIL SHEET HTML LOAD FAILED:", htmlError);
    }

    const jsonUrls = [];
    try {
      const jsonText = await fetchGvizJson(spreadsheetId);
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const payload = JSON.parse(jsonText.slice(start, end + 1));
        (payload?.table?.rows || []).forEach((row) => {
          (row?.c || []).forEach((cell) => {
            [cell?.v, cell?.f, cell?.html]
              .filter((value) => value !== undefined && value !== null)
              .forEach((value) => {
                const normalized = normalizeOfficialUrl(String(value));
                if (normalized) jsonUrls.push(normalized);
              });
          });
        });
      }
    } catch (jsonError) {
      console.warn("DETAIL SHEET JSON LOAD FAILED:", jsonError);
    }

    const rowTexts = htmlRows.map((row) =>
      row.map((cell) => cleanDetailText(cell.text)).filter(Boolean)
    );

    const preferredRowIndices = rowTexts.reduce((indices, cells, index) => {
      if (cells.some((text) =>
        /event website|official website|registration link|website & registration|website url|official url/i.test(text)
      )) {
        indices.push(index);
      }
      return indices;
    }, []);

    const preferredUrls = preferredRowIndices.flatMap((index) =>
      (htmlRows[index] || []).flatMap(extractUrlsFromCell)
    );
    const allHtmlUrls = htmlRows.flatMap((row) => row.flatMap(extractUrlsFromCell));

    const officialUrl =
      [...preferredUrls, ...jsonUrls, ...allHtmlUrls]
        .map(normalizeOfficialUrl)
        .find(Boolean) || "";

    let teamSize = "";
    for (const cells of rowTexts) {
      for (let i = 0; i < cells.length; i += 1) {
        if (!/^(team size|team size \/ team registration|registration team|reg\.\s*team)/i.test(cells[i])) continue;
        const inline = cleanDetailText(
          cells[i].replace(/^(team size|team size \/ team registration|registration team|reg\.\s*team)\s*[:：-]?\s*/i, "")
        );
        if (isRealOpportunityValue(inline)) {
          teamSize = inline;
          break;
        }
        const adjacent = cells.slice(i + 1).find(isRealOpportunityValue);
        if (adjacent) {
          teamSize = adjacent;
          break;
        }
      }
      if (teamSize) break;
    }

    const result = {
      officialUrl,
      teamSize,
      detailSheetUrl,
      detailOverview: "",
      detailThemes: [],
    };

    competitionDetailCache.set(detailSheetUrl, result);
    return result;
  } catch (error) {
    console.warn("Could not read competition detail sheet:", error);
    return {};
  }
};

const resolveCompetitionOfficialUrl = async (competition) => {
  if (!competition) return "";

  const direct = getOpportunityOfficialUrl(competition);
  if (direct) return direct;

  // Re-read only the public competition dashboard at click time.
  try {
    const mainJson = await fetchGvizJson(COMPETITION_SHEET_ID, COMPETITION_SHEET_NAME);
    const mainRows = parseGoogleVisualizationResponse(mainJson);
    const target = normalizeCompetitionKey(competition.name);
    const mainRow = mainRows.find((row) => normalizeCompetitionKey(row.sourceName) === target);

    const mainUrl = normalizeOfficialUrl(mainRow?.officialUrl);
    if (mainUrl) return mainUrl;

    for (const url of mainRow?.externalLinks || []) {
      if (!isGoogleSpreadsheetUrl(url)) {
        const normalized = normalizeOfficialUrl(url);
        if (normalized) return normalized;
      }
    }
  } catch (error) {
    console.warn("PUBLIC MAIN SHEET OFFICIAL URL LOOKUP FAILED:", error);
  }

  return getKnownCompetitionUrl(competition);
};

const getMainSheetOfficialUrl = (item) => {
  if (!item) return "";

  const preferredFieldPattern = /registration|official|event\s*website|website|external|url|link/i;
  const rawCells = item.rawCells || {};

  for (const [label, cell] of Object.entries(rawCells)) {
    if (!preferredFieldPattern.test(label)) continue;

    for (const value of [cell?.html, cell?.formula, cell?.value]) {
      const normalized = normalizeOfficialUrl(String(value ?? ""));
      if (normalized) return normalized;
    }
  }

  // The parser also keeps external links discovered in row cells. Only use
  // these after trying label-specific fields, and never use a Google Sheet URL.
  const external = (item.externalLinks || [])
    .filter((url) => !isGoogleSpreadsheetUrl(url))
    .map(normalizeOfficialUrl)
    .find(Boolean);

  return external || "";
};

const getOpportunityOfficialUrl = (item) => {
  if (!item) return "";

  const direct = [
    item.officialUrl,
    item.registrationUrl,
    item.registrationLink,
    item.formUrl,
    item.websiteUrl,
    item.website,
    item.externalUrl,
    item.link,
    item.url,
  ].map(normalizeOfficialUrl).find(Boolean);

  return direct || getMainSheetOfficialUrl(item) || getKnownCompetitionUrl(item);
};

const enrichCompetitionLinks = (competitions) =>
  competitions.map((competition) => {
    const officialUrl =
      normalizeOfficialUrl(competition.officialUrl) ||
      getMainSheetOfficialUrl(competition) ||
      getKnownCompetitionUrl(competition);
    const sheetOverview = normalizeSheetText(competition.challengeOverview);
    const staticOverview = getKnownCompetitionOverview(competition);

    return {
      ...competition,
      officialUrl,
      detailOfficialUrl: officialUrl,
      // Kept for compatibility; never fetched from the browser.
      detailSheetUrl: competition.detailSheetUrl || "",
      detailDashboardUrl: competition.detailDashboardUrl || "",
      dashboardUrl: competition.dashboardUrl,
      sourceUrl: competition.sourceUrl,
      teamSize: isRealOpportunityValue(competition.teamSize) ? competition.teamSize : "",
      detailOverview: sheetOverview || staticOverview,
      overviewSourceUrl: sheetOverview
        ? COMPETITION_SHEET_URL
        : getKnownCompetitionOverviewSource(competition),
      overviewSourceLabel: sheetOverview
        ? "CIT Competition Dashboard"
        : getKnownCompetitionOverviewSource(competition)
        ? (VERIFIED_OFFICIAL_COMPETITION_DATA[normalizeCompetitionKey(competition?.name || competition?.sourceName)]?.overviewUrl
            ? "Official organizer source"
            : "Official event source")
        : "",
      detailThemes: competition.detailThemes || [],
    };
  });

const DETAIL_TILE_STYLE = {
  minHeight: "74px",
  height: "auto",
  padding: "12px 10px",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  overflow: "visible",
  boxSizing: "border-box",
};

const DETAIL_TILE_LABEL_STYLE = {
  display: "block",
  fontSize: "9px",
  lineHeight: 1.25,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const DETAIL_TILE_VALUE_STYLE = {
  display: "block",
  width: "100%",
  maxWidth: "100%",
  marginTop: "6px",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 700,
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const getOpportunityDashboardUrl = (item) => {
  if (!item) return COMPETITION_SHEET_URL;
  if (item.dashboardUrl) return item.dashboardUrl;
  if (item.dataSource === "google_sheet_live" && item.sourceRow) {
    return `${COMPETITION_SHEET_URL}#range=B${item.sourceRow}`;
  }
  return item.sourceUrl || COMPETITION_SHEET_URL;
};

const parseGoogleVisualizationResponse = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("GOOGLE_SHEET_INVALID_RESPONSE");
  }

  const payload = JSON.parse(text.slice(start, end + 1));
  const table = payload?.table;
  if (!table?.rows || !Array.isArray(table.rows)) {
    throw new Error("GOOGLE_SHEET_NO_ROWS");
  }

  const labels = (table.cols || []).map((column) => normalizeSheetText(column?.label));

  return table.rows.map((row, rowIndex) => {
    const values = row?.c || [];
    const record = {};
    const rawCells = {};

    labels.forEach((label, index) => {
      if (!label) return;
      const cell = values[index] || {};
      record[label] = cell.v ?? "";
      rawCells[label] = {
        value: cell.v ?? "",
        formula: cell.f ?? "",
        html: cell.html ?? "",
      };
    });

    const findFirstField = (candidates) => {
      const key = candidates.find((candidate) =>
        Object.prototype.hasOwnProperty.call(record, candidate)
      );
      return key ? record[key] : "";
    };

    const externalLinks = [];
    const spreadsheetLinks = [];
    Object.values(rawCells).forEach((cell) => {
      [cell.value, cell.formula, cell.html].forEach((source) => {
        if (typeof source !== "string") return;
        const urls = source.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        urls.forEach((url) => {
          const cleaned = url.replace(/[),.;]+$/, "");
          if (isGoogleSpreadsheetUrl(cleaned)) spreadsheetLinks.push(cleaned);
          else externalLinks.push(cleaned);
        });
        const normalized = normalizeOfficialUrl(source);
        if (normalized) externalLinks.push(normalized);
      });
    });

    return {
      sourceRow: rowIndex + 3,
      sourceName: normalizeSheetText(findFirstField(["Competition Name", "Hackathon Name", "Event Name", "Name"])),
      sourceStatus: normalizeSheetText(findFirstField(["Competition Status", "Status", "Registration Status"])),
      eligibleYear: normalizeSheetText(findFirstField(["Eligible Year", "Eligibility Year", "Eligible Years", "Year"])),
      registrationDeadline: findFirstField(["Reg. Deadline", "Registration Deadline", "Deadline", "Reg Deadline"]),
      round1Date: findFirstField(["R1 -Date", "R1 Date", "Round 1", "Round 1 Date"]),
      round2Date: findFirstField(["R2 - Date", "R2 Date", "Round 2", "Round 2 Date"]),
      competitionDate: findFirstField(["Competition Date", "Final Date", "Event Date"]),
      registrationTeam: findFirstField(["Reg. Team", "Registration Team"]),
      teamSize: findFirstField(["Team Size", "Team Size / Team Registration"]),
      registrationStudents: findFirstField(["Reg. Std", "Registration Students", "Registered Students"]),
      prizeAmount: normalizeSheetText(findFirstField(["Total Prize Amount", "Prize", "Prize Amount"])),
      category: normalizeSheetText(findFirstField(["Category", "Competition Category", "Type"])),
      organizer: normalizeSheetText(findFirstField(["Organizer", "Organiser", "Organizing Body"])),
      department: normalizeSheetText(findFirstField(["Department", "Eligible Department", "Branch", "Dept"])),
      challengeOverview: normalizeSheetText(findFirstField([
        "Challenge Overview",
        "Project Overview",
        "Challenge Description",
        "Overview",
        "Description",
      ])),
      officialUrl: normalizeSheetText(findFirstField([
        "Registration Link", "Registration URL", "Form Link", "Form URL",
        "Official Link", "Official URL", "Official Website", "Event Website",
        "Event Website URL", "Event Website & Registration Link", "Website & Registration",
        "Website", "Website URL",
      ])),
      sourceFields: record,
      rawCells,
      externalLinks: [...new Set(externalLinks.map(normalizeOfficialUrl).filter(Boolean))],
      spreadsheetLinks: [...new Set(spreadsheetLinks.filter(Boolean))],
    };
  });
};

const fetchLiveCompetitionDashboard = async () => {
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: COMPETITION_SHEET_NAME,
  });

  const endpoint =
    `https://docs.google.com/spreadsheets/d/${COMPETITION_SHEET_ID}/gviz/tq?${params.toString()}`;

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_SHEET_HTTP_${response.status}`);
  }

  const text = await response.text();
  const rawRows = parseGoogleVisualizationResponse(text);

  const competitions = rawRows
    .filter((row) => row.sourceName)
    .map((row) => {
      const deadline = parseSheetDate(row.registrationDeadline);
      const sourceId = `sheet_${row.sourceRow}_${row.sourceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}`;

      const activeForRegistration = isRegistrationActive(row);
      const knownDetailSheet = getCompetitionDetailSheetFallback({ name: row.sourceName });

      return {
        id: sourceId,
        name: row.sourceName,
        description:
          `${row.category || "Competition"} organized by ${row.organizer || "the listed organizer"}. ` +
          `Eligible: ${row.eligibleYear || "Eligibility details available in the official source."}`,
        icon: "rocket",
        date: formatOpportunityDate(deadline),
        registrationDeadline: deadline,
        sourceStatus: row.sourceStatus,
        eligibleYear: row.eligibleYear,
        category: row.category,
        organizer: row.organizer,
        department: row.department,
        challengeOverview: row.challengeOverview,
        officialUrl: normalizeOfficialUrl(row.officialUrl) || getKnownCompetitionUrl(row),
        registrationTeam: row.registrationTeam,
        teamSize: isRealOpportunityValue(row.teamSize) ? row.teamSize : "",
        registrationStudents: row.registrationStudents,
        prizeAmount: row.prizeAmount,
        round1Date: row.round1Date,
        round2Date: row.round2Date,
        competitionDate: row.competitionDate,
        daysRemaining: getCompetitionDaysRemaining(row),
        activeForRegistration,
        sourceRow: row.sourceRow,
        dashboardUrl: `${COMPETITION_SHEET_URL}#range=B${row.sourceRow}`,
        sourceUrl: `${COMPETITION_SHEET_URL}#range=B${row.sourceRow}`,
        sourceLabel: "CIT Competition Dashboard",
        dataSource: "google_sheet_live",
        sourceFields: row.sourceFields,
        rawCells: row.rawCells,
        externalLinks: row.externalLinks,
        spreadsheetLinks: row.spreadsheetLinks,
        detailSheetUrl: knownDetailSheet,
        detailDashboardUrl: knownDetailSheet,
      };
    })
    .filter((competition) => competition.activeForRegistration);

  return enrichCompetitionLinks(competitions);
};

const fetchAllCompetitionDashboard = async () => {
  const text = await fetchGvizJson(COMPETITION_SHEET_ID, COMPETITION_SHEET_NAME);
  const rawRows = parseGoogleVisualizationResponse(text);

  const competitions = rawRows
    .filter((row) => row.sourceName)
    .map((row) => {
      const deadline = parseSheetDate(row.registrationDeadline);
      const sourceId = `sheet_${row.sourceRow}_${row.sourceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}`;
      const activeForRegistration = isRegistrationActive(row);
      const knownDetailSheet = getCompetitionDetailSheetFallback({ name: row.sourceName });

      return {
        id: sourceId,
        name: row.sourceName,
        description:
          `${row.category || "Competition"} organized by ${row.organizer || "the listed organizer"}. ` +
          `Eligible: ${row.eligibleYear || "Eligibility details available in the official source."}`,
        icon: "rocket",
        date: formatOpportunityDate(deadline),
        registrationDeadline: deadline,
        sourceStatus: row.sourceStatus,
        eligibleYear: row.eligibleYear,
        category: row.category,
        organizer: row.organizer,
        department: row.department,
        challengeOverview: row.challengeOverview,
        officialUrl: normalizeOfficialUrl(row.officialUrl),
        registrationTeam: row.registrationTeam,
        teamSize: isRealOpportunityValue(row.teamSize) ? row.teamSize : "",
        registrationStudents: row.registrationStudents,
        prizeAmount: row.prizeAmount,
        round1Date: row.round1Date,
        round2Date: row.round2Date,
        competitionDate: row.competitionDate,
        daysRemaining: getCompetitionDaysRemaining(row),
        activeForRegistration,
        statusLabel: activeForRegistration ? "Registration Open" : "Registration Closed",
        sourceRow: row.sourceRow,
        dashboardUrl: `${COMPETITION_SHEET_URL}#range=B${row.sourceRow}`,
        sourceUrl: `${COMPETITION_SHEET_URL}#range=B${row.sourceRow}`,
        sourceLabel: "CIT Competition Dashboard",
        dataSource: "google_sheet_live",
        sourceFields: row.sourceFields,
        rawCells: row.rawCells,
        externalLinks: row.externalLinks,
        spreadsheetLinks: row.spreadsheetLinks,
        detailSheetUrl: knownDetailSheet,
        detailDashboardUrl: knownDetailSheet,
      };
    });

  return enrichCompetitionLinks(competitions);
};


const COMPETITION_FINAL_POLISH_CSS = `
/* =========================================================
   CAMPUSCONNECT — COMPETITIONS FINAL UI POLISH
   Scoped to #hackathons and the competition details modal.
   ========================================================= */

#hackathons {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(124, 92, 255, 0.34);
  background:
    radial-gradient(circle at 14% 0%, rgba(124, 92, 255, 0.20), transparent 34%),
    radial-gradient(circle at 92% 15%, rgba(62, 144, 255, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(28, 24, 79, 0.96), rgba(10, 14, 38, 0.98));
  box-shadow:
    0 28px 70px rgba(4, 7, 20, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
}

#hackathons::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255,255,255,0.03), transparent 35%, rgba(123,92,255,0.025));
}

#hackathons > * {
  position: relative;
  z-index: 1;
}

#hackathons .section-heading {
  padding-bottom: 18px;
}

#hackathons .section-heading h2 {
  margin: 6px 0 8px;
  font-size: clamp(26px, 2.2vw, 36px);
  letter-spacing: -0.035em;
}

#hackathons .section-heading p {
  max-width: 760px;
  margin: 0 auto;
  color: rgba(226, 229, 245, 0.66);
  line-height: 1.65;
}

#hackathons .opportunity-toolbar {
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(7, 11, 32, 0.56);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
}

#hackathons .opportunity-search {
  min-height: 46px;
  border-radius: 13px;
  border: 1px solid rgba(133, 112, 255, 0.20);
  background: rgba(4, 8, 28, 0.64);
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

#hackathons .opportunity-search:focus-within {
  border-color: rgba(138, 111, 255, 0.62);
  box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.10);
  transform: translateY(-1px);
}

#hackathons .opportunity-search input {
  font-size: 13px;
}

#hackathons .styled-select {
  min-height: 46px;
}

#hackathons .styled-select-trigger {
  min-height: 46px;
  border-radius: 13px;
  border: 1px solid rgba(133, 112, 255, 0.18);
  background: rgba(4, 8, 28, 0.64);
}

#hackathons .opportunity-summary {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 15px;
  border: 1px solid rgba(255,255,255,0.065);
  background: rgba(255,255,255,0.026);
}

#hackathons .opportunity-summary strong {
  font-size: 18px;
}

#hackathons .opportunity-summary a {
  font-weight: 700;
  transition: opacity .18s ease, transform .18s ease;
}

#hackathons .opportunity-summary a:hover {
  opacity: 1;
  transform: translateY(-1px);
}

#hackathons .opportunity-closing-soon {
  margin-top: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 197, 92, 0.16);
  background: linear-gradient(180deg, rgba(255,196,92,0.055), rgba(255,255,255,0.018));
}

#hackathons .event-grid {
  gap: 16px;
  margin-top: 18px;
}

#hackathons .event-card {
  position: relative;
  min-width: 0;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(137, 122, 255, 0.16);
  background:
    linear-gradient(180deg, rgba(21, 27, 65, 0.94), rgba(11, 16, 42, 0.96));
  box-shadow:
    0 12px 30px rgba(4, 7, 20, 0.20),
    inset 0 1px 0 rgba(255,255,255,0.035);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}

#hackathons .event-card:hover {
  transform: translateY(-3px);
  border-color: rgba(138, 111, 255, 0.38);
  box-shadow:
    0 18px 38px rgba(4, 7, 20, 0.28),
    0 0 0 1px rgba(124,92,255,0.05) inset;
}

#hackathons .event-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(124,92,255,0.28), rgba(65,129,255,0.18));
  border: 1px solid rgba(145,126,255,0.18);
}

#hackathons .event-date {
  display: inline-flex;
  margin-top: 3px;
  margin-bottom: 7px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(168, 151, 255, 0.96);
}

#hackathons .event-card h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
  letter-spacing: -0.018em;
}

#hackathons .event-card > div:last-of-type > p,
#hackathons .event-card p {
  color: rgba(222, 226, 244, 0.66);
  line-height: 1.55;
}

#hackathons .opportunity-card-meta span {
  border-radius: 999px;
  border: 1px solid rgba(132, 113, 255, 0.16);
  background: rgba(124, 92, 255, 0.075);
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 700;
}

#hackathons .opportunity-card-deadline {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid rgba(255,255,255,0.06);
  color: rgba(233,236,250,0.66);
}

#hackathons .event-card-actions button {
  border-radius: 11px;
  font-weight: 800;
  border: 1px solid rgba(138,111,255,0.22);
  background: rgba(124,92,255,0.10);
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}

#hackathons .event-card-actions button:hover {
  background: rgba(124,92,255,0.18);
  border-color: rgba(138,111,255,0.42);
  transform: translateY(-1px);
}

/* ---------------- Competition detail modal ---------------- */
.competition-modal-overlay {
  padding: 46px 20px;
  box-sizing: border-box;
}

.competition-modal-overlay .hackathon-competition-modal {
  width: min(760px, calc(100vw - 40px));
  max-height: min(84vh, 820px);
  margin: 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  border-radius: 22px;
  border: 1px solid rgba(136, 110, 255, 0.46);
  background:
    radial-gradient(circle at 88% 4%, rgba(102, 93, 255, 0.11), transparent 26%),
    linear-gradient(180deg, rgba(11, 17, 43, 0.99), rgba(8, 13, 34, 0.99));
  box-shadow:
    0 35px 90px rgba(0,0,0,0.48),
    0 0 0 1px rgba(255,255,255,0.022) inset;
}

.competition-modal-overlay .hackathon-competition-modal::-webkit-scrollbar {
  width: 9px;
}

.competition-modal-overlay .hackathon-competition-modal::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.025);
  border-radius: 999px;
}

.competition-modal-overlay .hackathon-competition-modal::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(139, 119, 255, 0.38);
  border: 2px solid rgba(8,13,34,0.94);
}

.competition-modal-overlay .hackathon-competition-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 119, 255, 0.56);
}

.competition-modal-overlay .opportunity-overview {
  margin-top: 18px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(132, 113, 255, 0.15);
  background: linear-gradient(180deg, rgba(18,24,53,0.90), rgba(13,19,45,0.92));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.026);
}

.competition-modal-overlay .opportunity-overview p {
  margin: 10px 0 0;
  color: rgba(235,237,248,0.82);
  font-size: 14px;
  line-height: 1.68;
}

.competition-modal-overlay .opportunity-overview a {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  font-size: 11px !important;
}

.competition-modal-overlay .opportunity-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.competition-modal-overlay .opportunity-detail-grid > div {
  min-width: 0;
  min-height: 78px;
  padding: 13px 11px;
  border-radius: 14px;
  border: 1px solid rgba(132,113,255,0.13);
  background: rgba(18,24,52,0.76);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.022);
}

.competition-modal-overlay .opportunity-detail-grid > div:hover {
  border-color: rgba(138,111,255,0.23);
  background: rgba(21,27,61,0.82);
}

.competition-modal-overlay .opportunity-detail-grid strong {
  width: 100%;
  color: rgba(245,246,252,0.95);
  font-size: 12px;
  line-height: 1.42;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.competition-modal-overlay .opportunity-themes {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.055);
}

.competition-modal-overlay .opportunity-themes ul {
  margin: 9px 0 0;
  padding-left: 18px;
}

.competition-modal-overlay .opportunity-themes li {
  margin: 5px 0;
  color: rgba(230,233,248,0.74);
  line-height: 1.5;
}

.competition-modal-overlay .hackathon-modal-actions {
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 4px;
}

.competition-modal-overlay .hackathon-modal-actions .primary-button,
.competition-modal-overlay .hackathon-modal-actions .secondary-button {
  min-height: 42px;
  border-radius: 12px;
}

@media (max-width: 760px) {
  .competition-modal-overlay {
    padding: 34px 12px;
  }

  .competition-modal-overlay .hackathon-competition-modal {
    width: min(100%, calc(100vw - 24px));
    max-height: 86vh;
    border-radius: 19px;
  }

  .competition-modal-overlay .opportunity-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  #hackathons .event-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .competition-modal-overlay .opportunity-detail-grid {
    grid-template-columns: 1fr;
  }

  .competition-modal-overlay .opportunity-overview p {
    font-size: 13px;
  }
}
/* =========================================================
   COMPETITION BATCH CONTROL
========================================================= */

#hackathons .opportunity-show-more-wrap {
  margin-top: 16px;
  gap: 10px;
}

#hackathons .opportunity-show-more-wrap .secondary-button {
  min-height: 32px;
  padding: 0 12px;
  font-size: 9px;
}

/* =========================================================
   MOBILE LAYOUT + TEAM CARD SAFETY
   Desktop/laptop layout remains unchanged.
========================================================= */

@media (max-width: 760px) {
  html,
  body,
  #root {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .app-shell {
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  .sidebar {
    width: 56px !important;
    min-width: 56px !important;
    box-sizing: border-box;
  }

  .main-content {
    width: calc(100% - 56px) !important;
    max-width: calc(100% - 56px) !important;
    margin-left: 56px !important;
    min-width: 0 !important;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .topbar {
    width: 100% !important;
    box-sizing: border-box;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .dashboard {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 14px 8px 32px !important;
    box-sizing: border-box;
  }

  .dashboard-hero,
  #hackathons,
  .events-subsection,
  .messages-section,
  .resources-section,
  .teams-section,
  .teams-create-section,
  .create-team-card,
  .lower-section {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box;
  }

  .dashboard-hero {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }

  .stats-grid {
    width: 100% !important;
    min-width: 0 !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  #hackathons .event-grid {
    width: 100% !important;
    min-width: 0 !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  #hackathons .event-card {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .opportunity-toolbar {
    width: 100% !important;
    grid-template-columns: 1fr !important;
  }

  .opportunity-filters {
    width: 100% !important;
    grid-template-columns: 1fr !important;
  }

  .opportunity-search,
  .opportunity-filters select {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .opportunity-detail-grid {
    width: 100% !important;
    min-width: 0 !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  .opportunity-detail-grid > div {
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .team-modern-card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .team-card-main {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .team-card-actions {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  .team-card-actions > div {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  .team-card-actions button {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    margin: 0 !important;
  }

  #hackathons .opportunity-show-more-wrap {
    width: 100%;
    box-sizing: border-box;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 52px !important;
    min-width: 52px !important;
  }

  .main-content {
    width: calc(100% - 52px) !important;
    max-width: calc(100% - 52px) !important;
    margin-left: 52px !important;
  }

  .dashboard {
    padding-left: 7px !important;
    padding-right: 7px !important;
  }

  .topbar {
    padding-left: 7px !important;
    padding-right: 7px !important;
  }

  .dashboard-hero {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  #hackathons,
  .events-subsection,
  .messages-section,
  .resources-section,
  .teams-section,
  .teams-create-section,
  .create-team-card {
    padding-left: 11px !important;
    padding-right: 11px !important;
  }

  .team-modern-card {
    padding: 14px !important;
  }
}

@media (max-width: 360px) {
  .sidebar {
    width: 48px !important;
    min-width: 48px !important;
  }

  .main-content {
    width: calc(100% - 48px) !important;
    max-width: calc(100% - 48px) !important;
    margin-left: 48px !important;
  }

  .dashboard {
    padding-left: 5px !important;
    padding-right: 5px !important;
  }

  .topbar {
    padding-left: 5px !important;
    padding-right: 5px !important;
  }

  .dashboard-hero {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  #hackathons,
  .events-subsection,
  .messages-section,
  .resources-section,
  .teams-section,
  .teams-create-section,
  .create-team-card {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .team-modern-card {
    padding: 12px !important;
  }

  .opportunity-detail-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

function App() {
 
const [authUser, setAuthUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const authFlowRef = useRef(null);
const signUpSubmittingRef = useRef(false);
const forgotPasswordSubmittingRef = useRef(false);
const resendSubmittingRef = useRef(false);
const navigationLockUntilRef = useRef(0);
const identityWelcomePendingRef = useRef(false);
const [activeNav, setActiveNav] = useState("home");
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [teamCreated, setTeamCreated] = useState(false);
const [createdTeam, setCreatedTeam] = useState(null);
const [signInOpen, setSignInOpen] = useState(false);
const [signInError, setSignInError] = useState("");
const [signInMessage, setSignInMessage] = useState("");
const [verificationNeeded, setVerificationNeeded] = useState(false);

const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
const [forgotPasswordError, setForgotPasswordError] = useState("");

const [signUpOpen, setSignUpOpen] = useState(false);
const [signUpMessage, setSignUpMessage] = useState("");
const [signUpError, setSignUpError] = useState("");
const [signInLoading, setSignInLoading] = useState(false);
const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
const [resendLoading, setResendLoading] = useState(false);
const [signUpLoading, setSignUpLoading] = useState(false);
const [selectedHackathon, setSelectedHackathon] = useState(null);
const [hackathonInterestIds, setHackathonInterestIds] = useState(new Set());
const [hackathonInterestLoading, setHackathonInterestLoading] = useState(false);
const [hackathonCategoryFilter, setHackathonCategoryFilter] = useState("");
const [hackathonYearFilter, setHackathonYearFilter] = useState("");
const [opportunitySearch, setOpportunitySearch] = useState("");
const [showAllOpportunities, setShowAllOpportunities] = useState(false);
const [allCompetitions, setAllCompetitions] = useState([]);
const [allCompetitionsLoading, setAllCompetitionsLoading] = useState(false);
const [showAllCompetitions, setShowAllCompetitions] = useState(false);
const [allCompetitionVisibleCount, setAllCompetitionVisibleCount] = useState(10);
const [hackathonDetailsExpanded, setHackathonDetailsExpanded] = useState(false);

useEffect(() => {
  setHackathonDetailsExpanded(false);
}, [selectedHackathon?.id]);

const [opportunitySort, setOpportunitySort] = useState("deadline");

useEffect(() => {
  setAllCompetitionVisibleCount(10);
}, [
  opportunitySearch,
  hackathonCategoryFilter,
  ,
  hackathonYearFilter,
  opportunitySort,
  showAllCompetitions,
]);
const [selectedStudent, setSelectedStudent] = useState(null);
const [registrationOpen, setRegistrationOpen] = useState(false);
const [searchOpen, setSearchOpen] = useState(false);
const [lightMode, setLightMode] = useState(false);
const [searchText, setSearchText] = useState("");
const [searchCategory, setSearchCategory] = useState("students");
const [teammateDepartmentFilter, setTeammateDepartmentFilter] = useState("");
const [teammateYearFilter, setTeammateYearFilter] = useState("");
const [teammateSkillFilter, setTeammateSkillFilter] = useState("");
const [notificationOpen, setNotificationOpen] = useState(false);
const [notificationClearLoading, setNotificationClearLoading] = useState(false);
const [userMenuOpen, setUserMenuOpen] = useState(false);
const [connectionRequests, setConnectionRequests] = useState([]);
const [connections, setConnections] = useState([]);
const [connectionRemoveTarget, setConnectionRemoveTarget] = useState(null);
const [connectionRequestCancelTarget, setConnectionRequestCancelTarget] = useState(null);
const [notifications, setNotifications] = useState([]);
const [teamInvitations, setTeamInvitations] = useState([]);
const [userTeams, setUserTeams] = useState([]);
const [allTeams, setAllTeams] = useState([]);
const [teamMemberships, setTeamMemberships] = useState([]);
const [teamActionLoading, setTeamActionLoading] = useState(false);
const [connectionActionLoading, setConnectionActionLoading] = useState(false);
const [teamInviteLoading, setTeamInviteLoading] = useState(false);
const [teamInviteOpen, setTeamInviteOpen] = useState(false);
const [teamInviteSearch, setTeamInviteSearch] = useState("");
const [teamSearchId, setTeamSearchId] = useState("");
const [selectedTeam, setSelectedTeam] = useState(null);
const [selectedTeamPreview, setSelectedTeamPreview] = useState(null);
const [teamPreviewOwner, setTeamPreviewOwner] = useState(null);
const [teamPreviewMembers, setTeamPreviewMembers] = useState([]);
const [teamPreviewLoading, setTeamPreviewLoading] = useState(false);
const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
const [selectedTeamPendingInvites, setSelectedTeamPendingInvites] = useState([]);
const [teamStatusOpen, setTeamStatusOpen] = useState(false);
const [teamStatusReadOnly, setTeamStatusReadOnly] = useState(false);
const [teamStatusLoading, setTeamStatusLoading] = useState(false);
const [welcomeOpen, setWelcomeOpen] = useState(false);
const [welcomeSaving, setWelcomeSaving] = useState(false);
const [identitySetupOpen, setIdentitySetupOpen] = useState(false);
const [identitySetupSaving, setIdentitySetupSaving] = useState(false);
const [identitySetupError, setIdentitySetupError] = useState("");
const [identityNameDraft, setIdentityNameDraft] = useState("");
const [feedbackSupportOpen, setFeedbackSupportOpen] = useState(false);
const [teamRemoveTarget, setTeamRemoveTarget] = useState(null);
const [teamDeleteTarget, setTeamDeleteTarget] = useState(null);
const [teamChatOpen, setTeamChatOpen] = useState(false);
const [teamChatTeam, setTeamChatTeam] = useState(null);
const [teamChatMessages, setTeamChatMessages] = useState([]);
const [teamChatInput, setTeamChatInput] = useState("");
const [teamChatLoading, setTeamChatLoading] = useState(false);
const [teamChatSending, setTeamChatSending] = useState(false);
const [teamChatError, setTeamChatError] = useState("");
const [teamChatMessageMenu, setTeamChatMessageMenu] = useState(null);
const [teamChatReportTarget, setTeamChatReportTarget] = useState(null);
const [teamChatReportReason, setTeamChatReportReason] = useState("");
const [teamChatReportDescription, setTeamChatReportDescription] = useState("");
const [teamChatReportSubmitting, setTeamChatReportSubmitting] = useState(false);
const teamChatMessagesEndRef = useRef(null);

// ================= ONE-TO-ONE MESSAGES =================
const [directConversations, setDirectConversations] = useState([]);
const [directConversationsLoading, setDirectConversationsLoading] = useState(false);
const [directConversation, setDirectConversation] = useState(null);
// Canonical user profiles for people involved in direct messages, connections,
// pending message requests, and the blocked list. Conversation memberProfiles
// are historical snapshots, so they must not override the current users profile.
const [directParticipantProfiles, setDirectParticipantProfiles] = useState({});
const [directMessages, setDirectMessages] = useState([]);
const [directMessagesLoading, setDirectMessagesLoading] = useState(false);
const [directMessageInput, setDirectMessageInput] = useState("");
const [directMessageMediaFiles, setDirectMessageMediaFiles] = useState([]);
const [directMessageSending, setDirectMessageSending] = useState(false);
const [directMessageOpening, setDirectMessageOpening] = useState(false);
const [directMessageReportTarget, setDirectMessageReportTarget] = useState(null);
const [directMessageReportReason, setDirectMessageReportReason] = useState("");
const [directMessageReportDescription, setDirectMessageReportDescription] = useState("");
const [directMessageReportSubmitting, setDirectMessageReportSubmitting] = useState(false);
const [directMessageMenu, setDirectMessageMenu] = useState(null);
const [messageRequestTarget, setMessageRequestTarget] = useState(null);
const [messageRequestDraft, setMessageRequestDraft] = useState("");
const [messageRequestSending, setMessageRequestSending] = useState(false);
const [messageRequestActionLoading, setMessageRequestActionLoading] = useState(false);
const [sentDirectMessageRequests, setSentDirectMessageRequests] = useState([]);
const [receivedDirectMessageRequests, setReceivedDirectMessageRequests] = useState([]);

useEffect(() => {
  if (!directMessageMenu) return undefined;

  const closeMenu = () => setDirectMessageMenu(null);
  const handlePointerDown = (event) => {
    const target = event.target;
    if (target?.closest?.(".direct-message-menu-portal") || target?.closest?.(".direct-message-menu-button")) {
      return;
    }
    closeMenu();
  };

  document.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("resize", closeMenu);
    window.removeEventListener("scroll", closeMenu, true);
  };
}, [directMessageMenu]);

const toggleExpandedExchangeText = (key) => {
  setExpandedExchangeTextKeys((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
};

const [directConversationMenu, setDirectConversationMenu] = useState(false);
const [directConversationMenuPosition, setDirectConversationMenuPosition] = useState(null);
const [directConversationConfirm, setDirectConversationConfirm] = useState(null);

useEffect(() => {
  if (!directConversationMenu) return undefined;

  const handleOutsidePointer = (event) => {
    const target = event.target;
    if (
      target?.closest?.(".direct-conversation-action-menu-portal") ||
      target?.closest?.(".direct-conversation-action-button")
    ) {
      return;
    }
    setDirectConversationMenu(false);
    setDirectConversationMenuPosition(null);
  };

  const closeForViewportChange = () => {
    setDirectConversationMenu(false);
    setDirectConversationMenuPosition(null);
  };

  document.addEventListener("pointerdown", handleOutsidePointer);
  window.addEventListener("resize", closeForViewportChange);
  window.addEventListener("scroll", closeForViewportChange, true);

  return () => {
    document.removeEventListener("pointerdown", handleOutsidePointer);
    window.removeEventListener("resize", closeForViewportChange);
    window.removeEventListener("scroll", closeForViewportChange, true);
  };
}, [directConversationMenu]);


const [blockedUserIds, setBlockedUserIds] = useState([]);
const [clearedDirectConversationAt, setClearedDirectConversationAt] = useState({});
const directMessagesEndRef = useRef(null);

const directMessageRequests = useMemo(() => {
  const byId = new globalThis.Map();
  [...sentDirectMessageRequests, ...receivedDirectMessageRequests].forEach((request) => {
    byId.set(request.id, request);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}, [sentDirectMessageRequests, receivedDirectMessageRequests]);

const incomingDirectMessageRequests = useMemo(
  () => directMessageRequests.filter((request) =>
    request.recipientId === authUser?.uid &&
    request.status === "pending" &&
    !blockedUserIds.includes(request.senderId)
  ),
  [directMessageRequests, authUser?.uid, blockedUserIds]
);

const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
const [signOutOpen, setSignOutOpen] = useState(false);
const [communityFilter, setCommunityFilter] = useState("All");
const [communitySearch, setCommunitySearch] = useState("");
const [showSharedResources, setShowSharedResources] = useState(false);
const [marketplaceOpen, setMarketplaceOpen] = useState(false);
const [exchangeOpen, setExchangeOpen] = useState(false);
const [marketplaceEnquiry, setMarketplaceEnquiry] = useState(null);
const [marketplaceDeleteTarget, setMarketplaceDeleteTarget] = useState(null);
const [wantedDeleteTarget, setWantedDeleteTarget] = useState(null);
const [tradeGiveDeleteTarget, setTradeGiveDeleteTarget] = useState(null);
const [expandedExchangeTextKeys, setExpandedExchangeTextKeys] = useState(() => new Set());
const [wantedOpen, setWantedOpen] = useState(false);
const [wantedCreateOpen, setWantedCreateOpen] = useState(false);
const [wantedCreating, setWantedCreating] = useState(false);
const [wantedLoading, setWantedLoading] = useState(false);
const [wantedError, setWantedError] = useState("");
const [wantedListings, setWantedListings] = useState([]);
const [wantedForm, setWantedForm] = useState({
  title: "",
  description: "",
  category: "Electronics",
  budget: "",
  condition: "Any",
});
const notificationSeenIdsRef = useRef(new Set());
const [tradeGiveCreateOpen, setTradeGiveCreateOpen] = useState(false);
const [tradeGiveCreating, setTradeGiveCreating] = useState(false);
const [tradeGiveError, setTradeGiveError] = useState("");
const [tradeGiveListings, setTradeGiveListings] = useState([]);
const [tradeGiveLoading, setTradeGiveLoading] = useState(false);
const [tradeGiveSelectedListing, setTradeGiveSelectedListing] = useState(null);
const [tradeGiveRequestOpen, setTradeGiveRequestOpen] = useState(false);
const [tradeGiveRequestText, setTradeGiveRequestText] = useState("");
const [tradeGiveRequestSubmitting, setTradeGiveRequestSubmitting] = useState(false);
const [tradeGiveRequests, setTradeGiveRequests] = useState([]);
const [tradeGiveRequestsLoading, setTradeGiveRequestsLoading] = useState(false);
const [tradeGiveForm, setTradeGiveForm] = useState({
  mode: "trade",
  title: "",
  description: "",
  category: "Textbooks",
  condition: "Good",
  wantedItem: "",
  handoverLocation: "CIT Campus",
  files: [],
});
const [profilePageOpen, setProfilePageOpen] = useState(false);
const [profileNetworkOpen, setProfileNetworkOpen] = useState(false);
const [profileNetworkTab, setProfileNetworkTab] = useState("requests");
const [viewedProfile, setViewedProfile] = useState(null);
const [editProfileOpen, setEditProfileOpen] = useState(false);
const [profileNameDraft, setProfileNameDraft] = useState("");
const [profileNameError, setProfileNameError] = useState("");
const [profileMedia, setProfileMedia] = useState([]);
const [profileMediaLoading, setProfileMediaLoading] = useState(false);
const [profileMediaUploading, setProfileMediaUploading] = useState(false);
const [profileMediaError, setProfileMediaError] = useState("");

// ================= MARKETPLACE V1 =================
const [marketplaceListings, setMarketplaceListings] = useState([]);
const [marketplaceLoading, setMarketplaceLoading] = useState(false);
const [marketplaceError, setMarketplaceError] = useState("");
const [marketplaceCreateOpen, setMarketplaceCreateOpen] = useState(false);
const [marketplaceCreating, setMarketplaceCreating] = useState(false);
const [marketplaceFormError, setMarketplaceFormError] = useState("");
const [marketplaceForm, setMarketplaceForm] = useState({
  title: "",
  description: "",
  category: "Textbooks",
  condition: "Good",
  price: "",
  handoverLocation: "CIT Campus",
  files: [],
});
const [selectedMedia, setSelectedMedia] = useState(null);
const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
const [profileData, setProfileData] = useState({
  name: "",
  college: CAMPUSCONNECT_COLLEGE,
  department: "",
  year: "",
  bio: "",
  skills: "",
  campusConnectId: "",
  lockedNameSequence: "",
  identityProfileVersion: 0,
  identitySetupCompleted: false,
});

const [activityData, setActivityData] = useState({
  hackathonsJoined: 0,
  teamsCreated: 0,
  resourcesShared: 0,
});
const [communityResources, setCommunityResources] = useState([]);

// ================= PHASE 2: REAL REGISTRATIONS =================
const [registeredHackathonIds, setRegisteredHackathonIds] = useState([]);
const [registrationSubmitting, setRegistrationSubmitting] = useState(false);

// ================= PHASE 1: REAL FIRESTORE DATA =================
const [teammates, setTeammates] = useState([]);

const blockedStudentsForMessages = useMemo(
  () => blockedUserIds.map((id) => {
    const student = directParticipantProfiles[id] || teammates.find((item) => item.id === id);
    return student || { id, name: "CampusConnect student", campusConnectId: "" };
  }),
  [blockedUserIds, teammates, directParticipantProfiles]
);
const [hackathons, setHackathons] = useState([]);
const [dashboardStats, setDashboardStats] = useState({
  activeStudents: 0,
  hackathons: 0,
  resourcesShared: 0,
  teamsFormed: 0,
});
const [dataLoading, setDataLoading] = useState(true);
const [dataError, setDataError] = useState("");

useEffect(() => {
  if (!authUser) {
    return;
  }

  const loadCommunityResources = async () => {
    try {
      const resourcesSnapshot = await getDocs(
        collection(db, "communityResources")
      );

      const resources = resourcesSnapshot.docs.map(
        (resourceDoc) => ({
          id: resourceDoc.id,
          ...resourceDoc.data(),
        })
      );

      setCommunityResources(resources);
    } catch (error) {
      console.error(
        "COMMUNITY RESOURCES LOAD ERROR:",
        error
      );
    }
  };

  loadCommunityResources();
}, [authUser]);

// Live marketplace listings. The collection is intentionally read as a whole
// because every document is a public campus listing for verified CIT users.
useEffect(() => {
  if (!authUser) {
    setMarketplaceListings([]);
    setMarketplaceLoading(false);
    setMarketplaceError("");
    return;
  }

  setMarketplaceLoading(true);
  setMarketplaceError("");

  const unsubscribe = onSnapshot(
    collection(db, "marketplaceListings"),
    (snapshot) => {
      const listings = snapshot.docs
        .map((listingDoc) => ({
          id: listingDoc.id,
          ...listingDoc.data(),
        }))
        .filter((listing) => listing.status !== "removed")
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      setMarketplaceListings(listings);
      setMarketplaceLoading(false);
    },
    (error) => {
      console.error("MARKETPLACE LIVE LISTENER ERROR:", error);
      setMarketplaceError("Unable to load marketplace listings right now.");
      setMarketplaceLoading(false);
    }
  );

  return () => unsubscribe();
}, [authUser]);

// Wanted / Looking For posts share the existing marketplaceListings collection,
// so the feature does not require another Firestore collection or ruleset.
useEffect(() => {
  setWantedListings(
    marketplaceListings.filter(
      (listing) => listing.listingType === "wanted" && listing.status !== "removed"
    )
  );
  setWantedLoading(marketplaceLoading);
}, [marketplaceListings, marketplaceLoading]);

// Load the real CampusConnect data used by the dashboard and community.
// These collections are the Phase 1 data foundation: users, hackathons, and teams.
useEffect(() => {
  if (!authUser) {
    setTeammates([]);
    setHackathons([]);
    setRegisteredHackathonIds([]);
    setDashboardStats({
      activeStudents: 0,
      hackathons: 0,
      resourcesShared: 0,
      teamsFormed: 0,
    });
    setDataLoading(false);
    setDataError("");
    return;
  }

  let cancelled = false;

  const loadCampusData = async () => {
    setDataLoading(true);
    setDataError("");

    try {
      const [usersSnapshot, hackathonsSnapshot, teamsSnapshot, registrationsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "hackathons")),
          getDocs(collection(db, "teams")),
          getDocs(
            query(
              collection(db, "hackathonRegistrations"),
              where("userId", "==", authUser.uid)
            )
          ),
        ]);

      if (cancelled) return;

      const users = usersSnapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data(),
      }));

      const realTeammates = users
        .filter((person) => person.id !== authUser.uid)
        .map((person) => ({
          id: person.id,
          name: person.name || person.email?.split("@")[0] || "CIT Student",
          role: person.department || "Student",
          skills: Array.isArray(person.skills)
            ? person.skills
            : (person.skills || "")
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean),
          icon: Code2,
          status: person.status || "Available",
          email: person.email || "",
          year: person.year || "",
          college: person.college || "",
          bio: person.bio || "",
          campusConnectId: person.campusConnectId || "",
        }));

      const firestoreHackathons = hackathonsSnapshot.docs.map((hackathonDoc) => ({
        id: hackathonDoc.id,
        ...hackathonDoc.data(),
        icon: hackathonDoc.data().icon || "rocket",
      }));

      let realHackathons = firestoreHackathons;
      let liveCompetitionSyncError = "";

      try {
        const liveCompetitions = await fetchLiveCompetitionDashboard();
        realHackathons = liveCompetitions;
      } catch (sheetError) {
        console.error("LIVE COMPETITION SHEET ERROR:", sheetError);
        liveCompetitionSyncError =
          "Live competition dashboard could not be reached. Showing saved CampusConnect opportunities.";
      }

      const realRegisteredHackathonIds = registrationsSnapshot.docs.map(
        (registrationDoc) => registrationDoc.data().hackathonId
      );

      setTeammates(realTeammates);
      setHackathons(realHackathons);
      setRegisteredHackathonIds(realRegisteredHackathonIds);
      const totalResourcesShared = users.reduce(
        (total, person) => total + Math.max(0, Number(person.resourcesShared) || 0),
        0
      );

      setDashboardStats({
        // A user becomes an active student after completing verified sign-in.
        activeStudents:
          users.filter((person) => person.emailVerified === true).length +
          (users.some((person) => person.id === authUser.uid && person.emailVerified === true)
            ? 0
            : 1),
        hackathons: realHackathons.length,
        resourcesShared: totalResourcesShared,
        teamsFormed: teamsSnapshot.size,
      });

      if (liveCompetitionSyncError) {
        setDataError(liveCompetitionSyncError);
      }
    } catch (error) {
      console.error("CAMPUS DATA LOAD ERROR:", error);

      if (!cancelled) {
        setDataError(
          "Unable to load live campus data. Please check your Firestore setup."
        );
      }
    } finally {
      if (!cancelled) {
        setDataLoading(false);
      }
    }
  };

  loadCampusData();

  return () => {
    cancelled = true;
  };
}, [authUser]);

// Refresh the public Google Sheet periodically so newly added/removed competitions
// appear without requiring a deployment. Firestore remains the fallback source.
useEffect(() => {
  if (!authUser) return undefined;

  let cancelled = false;

  const refreshLiveCompetitions = async () => {
    try {
      const liveCompetitions = await fetchLiveCompetitionDashboard();
      if (!cancelled) {
        setHackathons(liveCompetitions);
        setDashboardStats((prev) => ({
          ...prev,
          hackathons: liveCompetitions.length,
        }));
        setDataError((current) =>
          current === "Live competition dashboard could not be reached. Showing saved CampusConnect opportunities."
            ? ""
            : current
        );
      }
    } catch (error) {
      console.error("LIVE COMPETITION REFRESH ERROR:", error);
    }
  };

  const intervalId = window.setInterval(refreshLiveCompetitions, 5 * 60 * 1000);
  window.addEventListener("focus", refreshLiveCompetitions);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
    window.removeEventListener("focus", refreshLiveCompetitions);
  };
}, [authUser]);

useEffect(() => {
  if (!identitySetupOpen || !authUser?.email) return undefined;

  // Always start the one-time identity step from the verified CIT email.
  // This also prevents stale browser/profile autofill from replacing the
  // email-derived name before the student makes their one allowed choice
  // (space insertion only).
  const identity = getCITEmailIdentity(authUser.email);
  const lockedSequence =
    identity?.nameSequence || profileData.lockedNameSequence || "";

  if (lockedSequence) {
    setIdentityNameDraft(formatLockedName(lockedSequence));
    setIdentitySetupError("");
  }

  return undefined;
}, [identitySetupOpen, authUser?.email]);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (!user) {
        setAuthUser(null);
        setBlockedUserIds([]);
        setClearedDirectConversationAt({});
        setSentDirectMessageRequests([]);
        setReceivedDirectMessageRequests([]);
        setDirectConversation(null);
        setDirectMessages([]);
        setWelcomeOpen(false);
        setWelcomeSaving(false);
        setIdentitySetupOpen(false);
        setIdentitySetupSaving(false);
        setIdentitySetupError("");
        setIdentityNameDraft("");
        identityWelcomePendingRef.current = false;
        setFeedbackSupportOpen(false);
        setTeamStatusReadOnly(false);
        setSignInLoading(false);
        setAuthLoading(false);
        return;
      }

      // During signup, Firebase immediately notifies this listener with the
      // newly-created (but still unverified) user. Do not sign that user out
      // here: the signup flow still needs to create the profile and send the
      // verification email. The signup handler performs the final sign-out.
      if (authFlowRef.current === "signup") {
        setAuthUser(null);
        return;
      }

      if (!isCollegeEmail(user.email)) {
        await signOut(auth);
        setAuthUser(null);
        setSignInLoading(false);
        setAuthLoading(false);
        setSignInError(getCollegeEmailError());
        return;
      }

      if (!user.emailVerified) {
        await signOut(auth);
        setAuthUser(null);
        setSignInLoading(false);
        setAuthLoading(false);
        return;
      }

      setAuthUser(user);

      try {
        const profileRef = doc(
          db,
          "users",
          user.uid
        );

        // Mark this profile as active only after Firebase has accepted a verified sign-in.
        await setDoc(
          profileRef,
          {
            emailVerified: true,
          },
          { merge: true }
        );

        const profileSnap = await getDoc(profileRef);

        let data = profileSnap.exists() ? profileSnap.data() : null;
        let campusConnectId = data?.campusConnectId || "";

        if (!campusConnectId) {
          try {
            campusConnectId = await ensureCampusConnectId(user);
            const refreshedProfile = await getDoc(profileRef);
            data = refreshedProfile.exists() ? refreshedProfile.data() : data;
          } catch (idError) {
            console.error("CAMPUS ID CREATION ERROR:", idError);
          }
        }

        const emailIdentity = getCITEmailIdentity(user.email);
        const legacyDepartment = normalizeDepartment(
          data?.department || data?.branch || data?.course || data?.program || ""
        );
        const derivedNameSequence = emailIdentity?.nameSequence || data?.lockedNameSequence || "";
        const derivedDepartment = emailIdentity?.department || legacyDepartment;
        const derivedBatchYear = emailIdentity?.batchYear || data?.batchYear || "";
        const derivedYear = getAcademicYearLabelFromBatch(emailIdentity?.batchYear) || data?.year || "";

        if (data) {
          const legacyName = (data.name || "").toString().trim();
          const legacyNameMatchesIdentity = Boolean(derivedNameSequence) &&
            legacyName.replace(/\s/g, "").toLowerCase() === derivedNameSequence.toLowerCase();
          const canonicalLegacyName = legacyNameMatchesIdentity
            ? formatLockedName(legacyName)
            : formatLockedName(derivedNameSequence);
          const identityNeedsSetup = Boolean(
            derivedNameSequence &&
            (data.identitySetupCompleted !== true ||
              data.lockedNameSequence !== derivedNameSequence ||
              data.identityProfileVersion !== IDENTITY_PROFILE_VERSION)
          );
          const identityPatch = {
            college: CAMPUSCONNECT_COLLEGE,
            department: derivedDepartment,
            batchYear: derivedBatchYear,
            year: derivedYear,
            lockedNameSequence: derivedNameSequence || data.lockedNameSequence || "",
            identityProfileVersion: IDENTITY_PROFILE_VERSION,
            identitySetupCompleted: identityNeedsSetup ? false : true,
            email: user.email || data.email || "",
          };
          const identityPatchDiffers =
            data.college !== identityPatch.college ||
            normalizeDepartment(data.department || "") !== normalizeDepartment(identityPatch.department || "") ||
            data.batchYear !== identityPatch.batchYear ||
            data.year !== identityPatch.year ||
            data.lockedNameSequence !== identityPatch.lockedNameSequence ||
            data.identityProfileVersion !== identityPatch.identityProfileVersion ||
            data.identitySetupCompleted !== identityPatch.identitySetupCompleted ||
            data.email !== identityPatch.email;

          if (identityPatchDiffers) {
            await setDoc(profileRef, identityPatch, { merge: true });
            data = { ...data, ...identityPatch };
          }

          const displayName = identityNeedsSetup
            ? canonicalLegacyName
            : legacyNameMatchesIdentity
              ? formatLockedName(legacyName)
              : formatLockedName(derivedNameSequence) || legacyName;

          setProfileData({
            name: displayName,
            college: CAMPUSCONNECT_COLLEGE,
            department: normalizeDepartment(derivedDepartment),
            batchYear: derivedBatchYear,
            year: derivedYear,
            bio: data.bio || "",
            skills: data.skills || "",
            campusConnectId: data.campusConnectId || campusConnectId || "",
            email: user.email || data.email || "",
            lockedNameSequence: derivedNameSequence || data.lockedNameSequence || "",
            identityProfileVersion: IDENTITY_PROFILE_VERSION,
            identitySetupCompleted: !identityNeedsSetup,
            blockedUserIds: Array.isArray(data.blockedUserIds) ? data.blockedUserIds : [],
            clearedDirectConversationAt: data.clearedDirectConversationAt || {},
          });

          setActivityData({
            hackathonsJoined: data.hackathonsJoined || 0,
            teamsCreated: data.teamsCreated || 0,
            resourcesShared: data.resourcesShared || 0,
          });

          setBlockedUserIds(Array.isArray(data.blockedUserIds) ? data.blockedUserIds : []);

          // Migrate the previous hide-only implementation to per-user clear timestamps.
          // This prevents legacy hidden chats from reopening with their old message history.
          const persistedClearMap = data.clearedDirectConversationAt &&
            typeof data.clearedDirectConversationAt === "object"
              ? { ...data.clearedDirectConversationAt }
              : {};
          const legacyHiddenIds = Array.isArray(data.hiddenDirectConversationIds)
            ? data.hiddenDirectConversationIds
            : [];
          const legacyIdsToMigrate = legacyHiddenIds.filter((id) => !persistedClearMap[id]);
          const migrationDate = new Date();
          legacyIdsToMigrate.forEach((id) => {
            persistedClearMap[id] = migrationDate;
          });
          setClearedDirectConversationAt(persistedClearMap);

          if (legacyHiddenIds.length > 0) {
            const migrationPatch = { hiddenDirectConversationIds: [] };
            legacyIdsToMigrate.forEach((id) => {
              migrationPatch[`clearedDirectConversationAt.${id}`] = serverTimestamp();
            });
            try {
              await updateDoc(profileRef, migrationPatch);
            } catch (migrationError) {
              console.error("DIRECT CONVERSATION CLEAR MIGRATION ERROR:", migrationError);
            }
          }

          if (identityNeedsSetup) {
            identityWelcomePendingRef.current = !data.welcomeSeen;
            setIdentityNameDraft(
              legacyNameMatchesIdentity ? canonicalLegacyName : formatLockedName(derivedNameSequence)
            );
            setIdentitySetupError("");
            setWelcomeOpen(false);
            setIdentitySetupOpen(true);
          } else if (!data.welcomeSeen) {
            identityWelcomePendingRef.current = false;
            setWelcomeOpen(true);
          }
        } else {
          const identityName = formatLockedName(derivedNameSequence);
          const initialProfile = {
            name: identityName,
            email: user.email || "",
            college: CAMPUSCONNECT_COLLEGE,
            department: normalizeDepartment(derivedDepartment),
            batchYear: emailIdentity?.batchYear || "",
            year: derivedYear,
            bio: "",
            skills: "",
            hackathonsJoined: 0,
            teamsCreated: 0,
            resourcesShared: 0,
            campusConnectId: "",
            lockedNameSequence: derivedNameSequence,
            identityProfileVersion: IDENTITY_PROFILE_VERSION,
            identitySetupCompleted: false,
            blockedUserIds: [],
            hiddenDirectConversationIds: [],
            clearedDirectConversationAt: {},
          };

          try {
            initialProfile.campusConnectId = await ensureCampusConnectId(user);
          } catch (idError) {
            console.error("CAMPUS ID CREATION ERROR:", idError);
          }

          await setDoc(profileRef, initialProfile);

          setProfileData({
            name: identityName,
            college: CAMPUSCONNECT_COLLEGE,
            department: normalizeDepartment(derivedDepartment),
            batchYear: emailIdentity?.batchYear || "",
            year: derivedYear,
            bio: "",
            skills: "",
            email: user.email || "",
            campusConnectId: initialProfile.campusConnectId || "",
            lockedNameSequence: derivedNameSequence,
            identityProfileVersion: IDENTITY_PROFILE_VERSION,
            identitySetupCompleted: false,
            blockedUserIds: [],
            clearedDirectConversationAt: {},
          });

          setActivityData({
            hackathonsJoined: 0,
            teamsCreated: 0,
            resourcesShared: 0,
          });

          identityWelcomePendingRef.current = true;
          setIdentityNameDraft(identityName);
          setIdentitySetupError("");
          setWelcomeOpen(false);
          setIdentitySetupOpen(true);
        }
      } catch (error) {
        console.error(
          "PROFILE LOAD ERROR:",
          error
        );

        setProfileData((prev) => ({
          ...prev,
          name: prev.name || "",
        }));
      }

      setSignInLoading(false);
      setAuthLoading(false);
    }
  );

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (!authUser) return;

  const connectionsQuery = query(
    collection(db, "connections"),
    where("userIds", "array-contains", authUser.uid)
  );

  const unsubscribeConnections = onSnapshot(
    connectionsQuery,
    (snapshot) => {
      setConnections(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error("CONNECTIONS LIVE UPDATE ERROR:", error);
    }
  );

  return () => unsubscribeConnections();
}, [authUser]);

useEffect(() => {
  if (!authUser) {
    setConnectionRequests([]);
    setConnections([]);
    setNotifications([]);
    setTeamInvitations([]);
    setUserTeams([]);
    setAllTeams([]);
    setTeamMemberships([]);
    return;
  }

  let cancelled = false;

  const loadRelationshipData = async () => {
    try {
      const [incomingSnap, outgoingSnap, connectionsSnap, invitationsSnap, teamsSnap, membershipsSnap] =
        await Promise.all([
          getDocs(query(collection(db, "connectionRequests"), where("receiverId", "==", authUser.uid))),
          getDocs(query(collection(db, "connectionRequests"), where("senderId", "==", authUser.uid))),
          getDocs(query(collection(db, "connections"), where("userIds", "array-contains", authUser.uid))),
          getDocs(query(collection(db, "teamInvitations"), where("inviteeId", "==", authUser.uid))),
          getDocs(collection(db, "teams")),
          getDocs(query(collection(db, "teamMemberships"), where("memberId", "==", authUser.uid))),
        ]);

      if (cancelled) return;

      const incoming = incomingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const outgoing = outgoingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const requestMap = new globalThis.Map();
      [...incoming, ...outgoing].forEach((request) => requestMap.set(request.id, request));
      setConnectionRequests(Array.from(requestMap.values()));

      setConnections(connectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      let loadedTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Give older teams a human-friendly Team ID when the current user owns them.
      // New teams receive one during creation. For teams owned by someone else,
      // we leave the existing document untouched.
      const ownedTeamsMissingId = loadedTeams.filter(
        (team) => team.createdBy === authUser.uid && !team.teamConnectId
      );

      if (ownedTeamsMissingId.length > 0) {
        const updatedOwnedTeams = await Promise.all(
          ownedTeamsMissingId.map(async (team) => {
            const teamConnectId = generateTeamConnectId();
            await updateDoc(doc(db, "teams", team.id), { teamConnectId });
            return { ...team, teamConnectId };
          })
        );

        const updatedMap = new globalThis.Map(
          updatedOwnedTeams.map((team) => [team.id, team])
        );
        loadedTeams = loadedTeams.map((team) => updatedMap.get(team.id) || team);
      }

      const loadedMemberships = membershipsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const membershipTeamIds = new Set(loadedMemberships.map((item) => item.teamId));
      const joinedTeams = loadedTeams.filter((team) =>
        team.createdBy === authUser.uid || membershipTeamIds.has(team.id)
      );

      setTeamInvitations(invitationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllTeams(loadedTeams);
      setTeamMemberships(loadedMemberships);
      setUserTeams(joinedTeams);
    } catch (error) {
      console.error("RELATIONSHIP DATA LOAD ERROR:", error);
    }
  };

  loadRelationshipData();

  return () => { cancelled = true; };
}, [authUser]);

// Keep notifications live so a newly-created notification immediately
// brings the unread indicator back without requiring a page refresh.
useEffect(() => {
  if (!authUser) {
    setNotifications([]);
    notificationSeenIdsRef.current = new Set();
    return;
  }

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("recipientId", "==", authUser.uid)
  );

  const unsubscribe = onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const nextNotifications = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      const newEnquiry =
        notificationSeenIdsRef.current.size > 0
          ? nextNotifications.find(
              (item) =>
                item.type === "marketplace_enquiry" &&
                !notificationSeenIdsRef.current.has(item.id)
            )
          : null;

      nextNotifications.forEach((item) => {
        notificationSeenIdsRef.current.add(item.id);
      });

      if (newEnquiry) {
        setMarketplaceEnquiry(newEnquiry);
      }

      setNotifications(nextNotifications);
    },
    (error) => {
      console.error("NOTIFICATION LISTENER ERROR:", error);
    }
  );

  return () => unsubscribe();
}, [authUser]);
// Keep connection requests live so Accept / Decline
// appears immediately when another student sends a request.
useEffect(() => {
  if (!authUser) {
    setConnectionRequests([]);
    return;
  }

  const incomingQuery = query(
    collection(db, "connectionRequests"),
    where("receiverId", "==", authUser.uid)
  );

  const outgoingQuery = query(
    collection(db, "connectionRequests"),
    where("senderId", "==", authUser.uid)
  );

  let incomingRequests = [];
  let outgoingRequests = [];

  const updateRequests = () => {
    const merged = [
      ...incomingRequests,
      ...outgoingRequests,
    ];

    const uniqueRequests = Array.from(
    new globalThis.Map(
        merged.map((request) => [request.id, request])
      ).values()
    );

    setConnectionRequests(uniqueRequests);
  };

  const unsubscribeIncoming = onSnapshot(
    incomingQuery,
    (snapshot) => {
      incomingRequests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      updateRequests();
    },
    (error) => {
      console.error(
        "INCOMING CONNECTION REQUEST LISTENER ERROR:",
        error
      );
    }
  );

  const unsubscribeOutgoing = onSnapshot(
    outgoingQuery,
    (snapshot) => {
      outgoingRequests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      updateRequests();
    },
    (error) => {
      console.error(
        "OUTGOING CONNECTION REQUEST LISTENER ERROR:",
        error
      );
    }
  );

  return () => {
    unsubscribeIncoming();
    unsubscribeOutgoing();
  };
}, [authUser]);

// ================= PROFILE MEDIA =================
// Profile media is stored in ImageKit and its metadata is stored in Firestore.
// The current profile (own profile or another student's profile) is loaded live.
useEffect(() => {
  const targetUserId = viewedProfile?.id || authUser?.uid;

  if (!targetUserId) {
    setProfileMedia([]);
    setProfileMediaLoading(false);
    setProfileMediaError("");
    return;
  }

  let cancelled = false;
  setProfileMediaLoading(true);
  setProfileMediaError("");

  const loadProfileMedia = async () => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "profileMedia"),
          where("userId", "==", targetUserId)
        )
      );

      if (cancelled) return;

      const media = snapshot.docs
        .map((mediaDoc) => ({
          id: mediaDoc.id,
          ...mediaDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      setProfileMedia(media);
    } catch (error) {
      console.error("PROFILE MEDIA LOAD ERROR:", error);
      if (!cancelled) {
        setProfileMedia([]);
        setProfileMediaError("Unable to load profile media right now.");
      }
    } finally {
      if (!cancelled) {
        setProfileMediaLoading(false);
      }
    }
  };

  loadProfileMedia();

  return () => {
    cancelled = true;
  };
}, [authUser, viewedProfile?.id]);

const uploadProfileMedia = async (fileList) => {
  if (!authUser || !fileList?.length) return;

  const files = Array.from(fileList);

  const invalidFile = files.find((file) => {
    const validType =
      file.type?.startsWith("image/") ||
      file.type === "application/pdf";

    return !validType || file.size > 10 * 1024 * 1024;
  });

  if (invalidFile) {
    showActionToast(
      "Only images or PDF files up to 10 MB each can be uploaded.",
      "error"
    );
    return;
  }

  setProfileMediaUploading(true);
  setProfileMediaError("");

  try {
    const imageKitAuth = await getImageKitAuth(authUser);

    for (const file of files) {
      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const fileName = `${authUser.uid}-${Date.now()}-${safeFileName}`;

      const uploaded = await imageKitUpload({
        file,
        fileName,
        publicKey: imageKitAuth.publicKey,
        signature: imageKitAuth.signature,
        token: imageKitAuth.token,
        expire: imageKitAuth.expire,
        folder: `/campusconnect/profile-media/${authUser.uid}`,
        useUniqueFileName: true,

        onProgress: (event) => {
          if (event.total) {
            const percentage = Math.round(
              (event.loaded / event.total) * 100
            );

            console.log(
              `Uploading ${file.name}: ${percentage}%`
            );
          }
        },
      });

      console.log("IMAGEKIT UPLOAD SUCCESS:", uploaded);

      const mediaDoc = {
        userId: authUser.uid,
        type:
          file.type === "application/pdf"
            ? "pdf"
            : "image",
        url: uploaded.url,
        thumbnailUrl:
          uploaded.thumbnailUrl || uploaded.url,
        fileId: uploaded.fileId || "",
        fileName: file.name,
        mimeType:
          file.type || "application/octet-stream",
        title: file.name,
        createdAt: serverTimestamp(),
      };

      const mediaRef = await addDoc(
        collection(db, "profileMedia"),
        mediaDoc
      );

      setProfileMedia((prev) => [
        {
          id: mediaRef.id,
          ...mediaDoc,
          createdAt: {
            toMillis: () => Date.now(),
          },
        },
        ...prev,
      ]);
    }

    showActionToast(
      files.length === 1
        ? "Achievement media uploaded successfully."
        : `${files.length} media files uploaded successfully.`
    );
  } catch (error) {
    console.error(
      "PROFILE MEDIA UPLOAD ERROR:",
      error
    );

    setProfileMediaError(
      "Unable to upload your media. Please try again."
    );

    showActionToast(
      "Media upload failed. Please check your ImageKit configuration."
    );
  } finally {
    setProfileMediaUploading(false);
  }
};

const deleteProfileMedia = async (media) => {
  if (!authUser || !media?.id || media.userId !== authUser.uid) return;

  try {
    await deleteDoc(doc(db, "profileMedia", media.id));
    setProfileMedia((prev) =>
      prev.filter((item) => item.id !== media.id)
    );
    setSelectedMedia(null);
    showActionToast(
      "Media removed from your profile."
    );
  } catch (error) {
    console.error("PROFILE MEDIA DELETE ERROR:", error);
    showActionToast(
      "Unable to remove this media right now."
    );
  }
};

const uploadMarketplaceImages = async (files) => {
  const imageKitAuth = await getImageKitAuth(authUser);

  const uploadedImages = [];

  for (const file of files) {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${authUser.uid}-${Date.now()}-${safeFileName}`;

    const uploaded = await imageKitUpload({
      file,
      fileName,
      publicKey: imageKitAuth.publicKey,
      signature: imageKitAuth.signature,
      token: imageKitAuth.token,
      expire: imageKitAuth.expire,
      folder: `/campusconnect/marketplace/${authUser.uid}`,
      useUniqueFileName: true,
    });

    uploadedImages.push({
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
      fileId: uploaded.fileId || "",
      fileName: file.name,
    });
  }

  return uploadedImages;
};

const resetMarketplaceForm = () => {
  setMarketplaceForm({
    title: "",
    description: "",
    category: "Textbooks",
    condition: "Good",
    price: "",
    handoverLocation: "CIT Campus",
    files: [],
  });
  setMarketplaceFormError("");
};

const handleMarketplaceFormChange = (field, value) => {
  setMarketplaceForm((prev) => ({ ...prev, [field]: value }));
};

const handleMarketplaceFiles = (fileList) => {
  const files = Array.from(fileList || []);

  if (files.length < 1) {
    setMarketplaceFormError("");
    setMarketplaceForm((prev) => ({ ...prev, files: [] }));
    return;
  }

  if (files.length > 6) {
    setMarketplaceFormError("You can add up to 6 product images.");
    showActionToast("You can add up to 6 product images.", "error");
    return;
  }

  const invalid = files.find(
    (file) => !file.type?.startsWith("image/") || file.size > 10 * 1024 * 1024
  );

  if (invalid) {
    setMarketplaceFormError("Only images up to 10 MB each are allowed.");
    showActionToast("Only images up to 10 MB each are allowed.", "error");
    return;
  }

  setMarketplaceFormError("");
  setMarketplaceForm((prev) => ({ ...prev, files }));
};

const createMarketplaceListing = async () => {
  if (!authUser) return;

  const form = marketplaceForm;
  const title = form.title.trim();
  const description = form.description.trim();
  const numericPrice = Number(form.price);

  if (!title || title.length < 3) {
    setMarketplaceFormError("Enter a product title.");
    return;
  }

  if (!description || description.length < 10) {
    setMarketplaceFormError("Add a short description of the item.");
    return;
  }

  if (!form.files.length) {
    setMarketplaceFormError("At least one product image is required.");
    return;
  }

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    setMarketplaceFormError("Enter a valid selling price.");
    return;
  }

  setMarketplaceCreating(true);
  setMarketplaceFormError("");

  try {
    // Keep ImageKit and Firestore errors separate so the UI tells us which
    // service actually failed instead of reporting both at once.
    let uploadedImages;

    try {
      uploadedImages = await uploadMarketplaceImages(form.files);
    } catch (imageKitError) {
      console.error("MARKETPLACE IMAGEKIT UPLOAD ERROR:", imageKitError);
      setMarketplaceFormError(
        "Product image upload failed. Please check your ImageKit setup and try again."
      );
      showActionToast("Image upload failed.");
      return;
    }

    const profileName =
      profileData.name || authUser.displayName || authUser.email?.split("@")[0] || "CIT Student";

    const listingData = {
      sellerId: authUser.uid,
      sellerName: profileName,
      sellerEmail: authUser.email || "",
      sellerDepartment: profileData.department || "",
      sellerYear: profileData.year || "",
      sellerCampusConnectId: profileData.campusConnectId || "",
      title,
      description,
      category: form.category,
      condition: form.condition,
      listingType: "fixed",
      price: numericPrice,
      handoverLocation: form.handoverLocation.trim() || "CIT Campus",
      imageUrls: uploadedImages.map((image) => image.url),
      imageThumbnails: uploadedImages.map((image) => image.thumbnailUrl),
      imageFileIds: uploadedImages.map((image) => image.fileId),
      imageFileNames: uploadedImages.map((image) => image.fileName),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "marketplaceListings"), listingData);
    } catch (firestoreError) {
      console.error("MARKETPLACE FIRESTORE CREATE ERROR:", firestoreError);

      if (firestoreError?.code === "permission-denied") {
        setMarketplaceFormError(
          "Firestore blocked this listing. Update/deploy the marketplace Firestore rules, then try again."
        );
        showActionToast("Firestore permission denied.");
      } else {
        setMarketplaceFormError(
          "The listing could not be saved. Please try again."
        );
        showActionToast("Unable to save the listing.");
      }
      return;
    }

    resetMarketplaceForm();
    setMarketplaceCreateOpen(false);
    showActionToast("Marketplace listing created successfully.");
  } finally {
    setMarketplaceCreating(false);
  }
};

const sendMarketplaceEnquiry = async (listing) => {
  if (!authUser || !listing?.id) return;

  if (listing.sellerId === authUser.uid) {
    showActionToast("You cannot enquire about your own listing.");
    return;
  }

  try {
    const requesterName =
      profileData.name || authUser.displayName || authUser.email?.split("@")[0] || "CIT Student";

    await addDoc(collection(db, "notifications"), {
      recipientId: listing.sellerId,
      actorId: authUser.uid,
      actorName: requesterName,
      type: "marketplace_enquiry",
      title: "New Marketplace Enquiry",
      message: `${requesterName} is interested in your ${listing.title || "item"}.`,
      relatedId: listing.id,
      listingId: listing.id,
      listingTitle: listing.title || "Marketplace item",
      listingPrice: Number(listing.price || 0),
      requesterId: authUser.uid,
      requesterName,
      requesterEmail: authUser.email || "",
      requesterDepartment: profileData.department || "",
      requesterYear: profileData.year || "",
      read: false,
      createdAt: serverTimestamp(),
    });

    showActionToast("Enquiry sent to the seller.");
  } catch (error) {
    console.error("MARKETPLACE ENQUIRY ERROR:", error);
    showActionToast("Unable to send the enquiry right now.");
  }
};

const closeMarketplaceEnquiry = async () => {
  const enquiry = marketplaceEnquiry;
  setMarketplaceEnquiry(null);
  if (enquiry?.id && !enquiry.read) {
    try {
      await updateDoc(doc(db, "notifications", enquiry.id), { read: true });
    } catch (error) {
      console.error("MARKETPLACE ENQUIRY READ ERROR:", error);
    }
  }
};

const getEnquiryPerson = (enquiry) => {
  if (!enquiry) return null;

  if (enquiry.type === "wanted_enquiry") {
    return {
      id: enquiry.helperId || enquiry.actorId,
      name: enquiry.helperName || enquiry.actorName || "CIT Student",
      email: enquiry.helperEmail || "",
      department: enquiry.helperDepartment || "",
      year: enquiry.helperYear || "",
      campusConnectId: enquiry.helperCampusConnectId || "",
    };
  }

  return {
    id: enquiry.requesterId || enquiry.actorId,
    name: enquiry.requesterName || enquiry.actorName || "CIT Student",
    email: enquiry.requesterEmail || "",
    department: enquiry.requesterDepartment || "",
    year: enquiry.requesterYear || "",
    campusConnectId: enquiry.requesterCampusConnectId || "",
  };
};

const startMarketplaceEnquiryChat = async () => {
  const enquiry = marketplaceEnquiry;
  const person = getEnquiryPerson(enquiry);
  if (!person?.id) return;

  await closeMarketplaceEnquiry();
  await openDirectConversation(person);
};

const viewMarketplaceEnquiryProfile = async () => {
  const enquiry = marketplaceEnquiry;
  const person = getEnquiryPerson(enquiry);
  if (!person?.id) return;

  await closeMarketplaceEnquiry();
  await openTeamMemberProfile({
    memberId: person.id,
    memberName: person.name,
  });
};

const deleteMarketplaceListing = (listing) => {
  if (!authUser || !listing?.id || listing.sellerId !== authUser.uid) return;
  setMarketplaceDeleteTarget(listing);
};

const confirmDeleteMarketplaceListing = async () => {
  const listing = marketplaceDeleteTarget;

  if (!authUser || !listing || listing.sellerId !== authUser.uid) {
    setMarketplaceDeleteTarget(null);
    return;
  }

  try {
    await deleteDoc(doc(db, "marketplaceListings", listing.id));
    setMarketplaceDeleteTarget(null);
    showActionToast("Listing deleted successfully.");
  } catch (error) {
    console.error("MARKETPLACE LISTING DELETE ERROR:", error);
    showActionToast("Unable to delete the listing right now.");
  }
};

const deleteWantedListing = (listing) => {
  if (!authUser || !listing?.id || listing.requesterId !== authUser.uid) return;
  setWantedDeleteTarget(listing);
};

const confirmDeleteWantedListing = async () => {
  const listing = wantedDeleteTarget;
  if (!authUser || !listing || listing.requesterId !== authUser.uid) {
    setWantedDeleteTarget(null);
    return;
  }

  try {
    await deleteDoc(doc(db, "marketplaceListings", listing.id));
    setWantedListings((prev) => prev.filter((item) => item.id !== listing.id));
    setWantedDeleteTarget(null);
    showActionToast("Wanted post deleted successfully.");
  } catch (error) {
    console.error("WANTED LISTING DELETE ERROR:", error);
    showActionToast("Unable to delete the wanted post right now.");
  }
};

const deleteTradeGiveListing = (listing) => {
  if (!authUser || !listing?.id || listing.ownerId !== authUser.uid) return;
  setTradeGiveDeleteTarget(listing);
};

const confirmDeleteTradeGiveListing = async () => {
  const listing = tradeGiveDeleteTarget;
  if (!authUser || !listing || listing.ownerId !== authUser.uid) {
    setTradeGiveDeleteTarget(null);
    return;
  }

  try {
    await deleteDoc(doc(db, "tradeGiveListings", listing.id));
    setTradeGiveListings((prev) => prev.filter((item) => item.id !== listing.id));
    setTradeGiveSelectedListing((prev) => prev?.id === listing.id ? null : prev);
    setTradeGiveDeleteTarget(null);
    showActionToast("Trade or Give listing deleted successfully.");
  } catch (error) {
    console.error("TRADE GIVE LISTING DELETE ERROR:", error);
    showActionToast("Unable to delete this listing right now.");
  }
};

const resetWantedForm = () => {
  setWantedForm({
    title: "",
    description: "",
    category: "Electronics",
    budget: "",
    condition: "Any",
  });
  setWantedError("");
};

const createWantedListing = async () => {
  if (!authUser) return;

  const title = wantedForm.title.trim();
  const description = wantedForm.description.trim();
  const budget = Number(wantedForm.budget);

  if (!title || title.length < 3) {
    setWantedError("Enter what you are looking for.");
    return;
  }
  if (!description || description.length < 5) {
    setWantedError("Add a short description of what you need.");
    return;
  }
  if (wantedForm.budget && (!Number.isFinite(budget) || budget < 0)) {
    setWantedError("Enter a valid budget or leave it blank.");
    return;
  }

  setWantedCreating(true);
  setWantedError("");

  try {
    const requesterName =
      profileData.name || authUser.displayName || authUser.email?.split("@")[0] || "CIT Student";

    await addDoc(collection(db, "marketplaceListings"), {
      requesterId: authUser.uid,
      requesterName,
      requesterEmail: authUser.email || "",
      requesterDepartment: profileData.department || "",
      requesterYear: profileData.year || "",
      title,
      description,
      category: wantedForm.category,
      budget: wantedForm.budget ? budget : null,
      condition: wantedForm.condition,
      listingType: "wanted",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    resetWantedForm();
    setWantedCreateOpen(false);
    showActionToast("Wanted post created successfully.");
  } catch (error) {
    console.error("WANTED LISTING CREATE ERROR:", error);
    setWantedError("Unable to create the wanted post right now.");
  } finally {
    setWantedCreating(false);
  }
};

const sendWantedEnquiry = async (listing) => {
  if (!authUser || !listing?.id) return;

  if (listing.requesterId === authUser.uid) {
    showActionToast("You cannot enquire about your own wanted post.");
    return;
  }

  try {
    const helperName =
      profileData.name || authUser.displayName || authUser.email?.split("@")[0] || "CIT Student";

    await addDoc(collection(db, "notifications"), {
      recipientId: listing.requesterId,
      actorId: authUser.uid,
      actorName: helperName,
      type: "wanted_enquiry",
      title: "Someone Can Help With Your Wanted Item",
      message: `${helperName} may have what you're looking for: ${listing.title || "your wanted item"}.`,
      relatedId: listing.id,
      listingId: listing.id,
      listingTitle: listing.title || "Wanted item",
      requesterId: listing.requesterId,
      helperId: authUser.uid,
      helperName,
      helperEmail: authUser.email || "",
      helperDepartment: profileData.department || "",
      helperYear: profileData.year || "",
      read: false,
      createdAt: serverTimestamp(),
    });

    showActionToast("Your interest was sent to the student.");
  } catch (error) {
    console.error("WANTED ENQUIRY ERROR:", error);
    showActionToast("Unable to send your response right now.");
  }
};

// ================= TRADE OR GIVE =================
const uploadTradeGiveImages = async (files) => {
  const imageKitAuth = await getImageKitAuth(authUser);

  const uploadedImages = [];

  for (const file of files) {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${authUser.uid}-${Date.now()}-${safeFileName}`;

    const uploaded = await imageKitUpload({
      file,
      fileName,
      publicKey: imageKitAuth.publicKey,
      signature: imageKitAuth.signature,
      token: imageKitAuth.token,
      expire: imageKitAuth.expire,
      folder: `/campusconnect/trade-or-give/${authUser.uid}`,
      useUniqueFileName: true,
    });

    uploadedImages.push({
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
      fileId: uploaded.fileId || "",
      fileName: file.name,
    });
  }

  return uploadedImages;
};

const handleTradeGiveFormChange = (field, value) => {
  setTradeGiveForm((prev) => ({ ...prev, [field]: value }));
  if (field === "mode") {
    setTradeGiveError("");
  }
};

const handleTradeGiveFiles = (fileList) => {
  const files = Array.from(fileList || []);

  if (files.length < 1) {
    setTradeGiveError("");
    setTradeGiveForm((prev) => ({ ...prev, files: [] }));
    return;
  }

  if (files.length > 6) {
    setTradeGiveError("You can add up to 6 item images.");
    showActionToast("You can add up to 6 item images.", "error");
    return;
  }

  const invalid = files.find(
    (file) => !file.type?.startsWith("image/") || file.size > 10 * 1024 * 1024
  );

  if (invalid) {
    setTradeGiveError("Only images up to 10 MB each are allowed.");
    showActionToast("Only images up to 10 MB each are allowed.", "error");
    return;
  }

  setTradeGiveError("");
  setTradeGiveForm((prev) => ({ ...prev, files }));
};

const resetTradeGiveForm = () => {
  setTradeGiveForm({
    mode: "trade",
    title: "",
    description: "",
    category: "Textbooks",
    condition: "Good",
    wantedItem: "",
    handoverLocation: "CIT Campus",
    files: [],
  });
  setTradeGiveError("");
};

const openTradeGive = () => {
  setExchangeOpen(true);
};

const createTradeGiveListing = async () => {
  if (!authUser) return;

  const form = tradeGiveForm;
  const title = form.title.trim();
  const description = form.description.trim();
  const wantedItem = form.wantedItem.trim();

  if (!title || title.length < 3) {
    setTradeGiveError("Enter an item title.");
    return;
  }

  if (!description || description.length < 10) {
    setTradeGiveError("Add a short description of the item.");
    return;
  }

  if (form.mode === "trade" && (!wantedItem || wantedItem.length < 3)) {
    setTradeGiveError("Tell students what you would like in return.");
    return;
  }

  if (!form.files.length) {
    setTradeGiveError("At least one item image is required.");
    return;
  }

  setTradeGiveCreating(true);
  setTradeGiveError("");

  try {
    const uploadedImages = await uploadTradeGiveImages(form.files);
    const profileName =
      profileData.name ||
      authUser.displayName ||
      authUser.email?.split("@")[0] ||
      "CIT Student";

    await addDoc(collection(db, "tradeGiveListings"), {
      ownerId: authUser.uid,
      ownerName: profileName,
      ownerEmail: authUser.email || "",
      ownerDepartment: profileData.department || "",
      ownerYear: profileData.year || "",
      ownerCampusConnectId: profileData.campusConnectId || "",
      mode: form.mode,
      title,
      description,
      category: form.category,
      condition: form.condition,
      wantedItem: form.mode === "trade" ? wantedItem : "",
      handoverLocation: form.handoverLocation.trim() || "CIT Campus",
      imageUrls: uploadedImages.map((image) => image.url),
      imageThumbnails: uploadedImages.map((image) => image.thumbnailUrl),
      imageFileIds: uploadedImages.map((image) => image.fileId),
      imageFileNames: uploadedImages.map((image) => image.fileName),
      status: "active",
      requestCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    resetTradeGiveForm();
    setTradeGiveCreateOpen(false);
    showActionToast(
      form.mode === "trade"
        ? "Trade listing created successfully."
        : "Give listing created successfully."
    );
  } catch (error) {
    console.error("TRADE OR GIVE CREATE ERROR:", error);
    setTradeGiveError("Unable to create the listing. Please try again.");
  } finally {
    setTradeGiveCreating(false);
  }
};

const openTradeGiveListing = (listing) => {
  setTradeGiveSelectedListing(listing);
  setTradeGiveRequestOpen(false);
  setTradeGiveRequestText("");
};

const submitTradeGiveRequest = async () => {
  const listing = tradeGiveSelectedListing;
  if (!authUser || !listing?.id) return;

  if (listing.ownerId === authUser.uid) {
    showActionToast("You cannot request your own listing.");
    return;
  }

  if (listing.status !== "active") {
    showActionToast("This item is no longer available.");
    return;
  }

  if (listing.mode === "trade" && tradeGiveRequestText.trim().length < 3) {
    showActionToast("Describe what you would like to offer in return.");
    return;
  }

  setTradeGiveRequestSubmitting(true);

  try {
    const requesterName =
      profileData.name ||
      authUser.displayName ||
      authUser.email?.split("@")[0] ||
      "CIT Student";

    await addDoc(collection(db, "tradeGiveRequests"), {
      listingId: listing.id,
      listingTitle: listing.title,
      listingMode: listing.mode,
      ownerId: listing.ownerId,
      ownerName: listing.ownerName || "CIT Student",
      requesterId: authUser.uid,
      requesterName,
      requesterDepartment: profileData.department || "",
      requesterYear: profileData.year || "",
      message: tradeGiveRequestText.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTradeGiveRequestOpen(false);
    setTradeGiveRequestText("");
    showActionToast(
      listing.mode === "trade"
        ? "Trade request sent to the student."
        : "Claim request sent to the student."
    );
  } catch (error) {
    console.error("TRADE OR GIVE REQUEST ERROR:", error);
    showActionToast("Unable to send the request right now.");
  } finally {
    setTradeGiveRequestSubmitting(false);
  }
};

const updateTradeGiveRequest = async (requestItem, nextStatus) => {
  if (!authUser || !requestItem?.id || !tradeGiveSelectedListing?.id) return;

  if (tradeGiveSelectedListing.ownerId !== authUser.uid) {
    showActionToast("Only the item owner can manage requests.");
    return;
  }

  try {
    await updateDoc(doc(db, "tradeGiveRequests", requestItem.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    if (nextStatus === "accepted") {
      await updateDoc(doc(db, "tradeGiveListings", tradeGiveSelectedListing.id), {
        status: "reserved",
        updatedAt: serverTimestamp(),
      });

      setTradeGiveSelectedListing((prev) =>
        prev?.id === tradeGiveSelectedListing.id
          ? { ...prev, status: "reserved" }
          : prev
      );
    }

    showActionToast(
      nextStatus === "accepted"
        ? "Request accepted."
        : "Request declined."
    );
  } catch (error) {
    console.error("TRADE OR GIVE REQUEST UPDATE ERROR:", error);
    showActionToast("Unable to update the request.");
  }
};

// Live Trade or Give listings.
useEffect(() => {
  if (!authUser) {
    setTradeGiveListings([]);
    setTradeGiveLoading(false);
    return undefined;
  }

  setTradeGiveLoading(true);

  const unsubscribe = onSnapshot(
    collection(db, "tradeGiveListings"),
    (snapshot) => {
      const listings = snapshot.docs
        .map((listingDoc) => ({
          id: listingDoc.id,
          ...listingDoc.data(),
        }))
        .filter((listing) => listing.status !== "removed")
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      setTradeGiveListings(listings);
      setTradeGiveLoading(false);
    },
    (error) => {
      console.error("TRADE OR GIVE LIVE LISTENER ERROR:", error);
      setTradeGiveListings([]);
      setTradeGiveLoading(false);
    }
  );

  return () => unsubscribe();
}, [authUser]);

// Requests for the selected listing: owners see all incoming requests;
// other students see only their own request for that listing.
useEffect(() => {
  if (!authUser || !tradeGiveSelectedListing?.id) {
    setTradeGiveRequests([]);
    setTradeGiveRequestsLoading(false);
    return undefined;
  }

  setTradeGiveRequestsLoading(true);

  const isOwner = tradeGiveSelectedListing.ownerId === authUser.uid;
  const requestsQuery = isOwner
    ? query(
        collection(db, "tradeGiveRequests"),
        where("listingId", "==", tradeGiveSelectedListing.id)
      )
    : query(
        collection(db, "tradeGiveRequests"),
        where("listingId", "==", tradeGiveSelectedListing.id),
        where("requesterId", "==", authUser.uid)
      );

  const unsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((requestDoc) => ({
          id: requestDoc.id,
          ...requestDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      setTradeGiveRequests(requests);
      setTradeGiveRequestsLoading(false);
    },
    (error) => {
      console.error("TRADE OR GIVE REQUEST LISTENER ERROR:", error);
      setTradeGiveRequests([]);
      setTradeGiveRequestsLoading(false);
    }
  );

  return () => unsubscribe();
}, [authUser, tradeGiveSelectedListing?.id, tradeGiveSelectedListing?.ownerId]);

const normalizedCommunitySearch = communitySearch.toLowerCase().trim();
const [shareResourceOpen, setShareResourceOpen] = useState(false);
const [shareResourceCategory, setShareResourceCategory] = useState("");
const [shareResourceImageFile, setShareResourceImageFile] = useState(null);
const [shareResourceUploading, setShareResourceUploading] = useState(false);
const [shareSuccess, setShareSuccess] = useState(false);
const [actionToast, setActionToast] = useState("");
const [actionToastTone, setActionToastTone] = useState("success");
  const [deleteResourceTarget, setDeleteResourceTarget] = useState(null);
const filteredCommunityResources = communityResources.filter((resource) => {
  const matchesCategory =
    communityFilter === "All" ||
    resource.category === communityFilter;

  const searchableText = `
    ${resource.title}
    ${resource.category}
    ${resource.description}
  `.toLowerCase();

  const matchesSearch =
    normalizedCommunitySearch === "" ||
    searchableText.includes(normalizedCommunitySearch);

  return matchesCategory && matchesSearch;
});
const showActionToast = (message, tone = "success") => {
  setActionToast(message);
  setActionToastTone(tone);

  setTimeout(() => {
    setActionToast("");
  }, 3000);
};

  const uploadShareResourceImage = async (file) => {
    if (!file || !authUser) return null;

    const imageKitAuth = await getImageKitAuth(authUser);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const uploaded = await imageKitUpload({
      file,
      fileName: `${authUser.uid}-${Date.now()}-${safeFileName}`,
      publicKey: imageKitAuth.publicKey,
      signature: imageKitAuth.signature,
      token: imageKitAuth.token,
      expire: imageKitAuth.expire,
      folder: `/campusconnect/community-resources/${authUser.uid}`,
      useUniqueFileName: true,
    });

    return {
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
      fileId: uploaded.fileId || "",
      fileName: file.name,
    };
  };

  const handleShareResourceImage = (fileList) => {
    const file = Array.from(fileList || [])[0];

    if (!file) {
      setShareResourceImageFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (
      !allowedTypes.includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setShareResourceImageFile(null);
      showActionToast("Use one JPG, PNG, or WebP image up to 3 MB.", "error");
      return;
    }

    setShareResourceImageFile(file);
  };


  const handleDeleteResource = (resource) => {
    if (
      !authUser ||
      resource.userId !== authUser.uid
    ) {
      return;
    }

    setDeleteResourceTarget(resource);
  };

  const confirmDeleteResource = async () => {
    const resource = deleteResourceTarget;

    if (
      !authUser ||
      !resource ||
      resource.userId !== authUser.uid
    ) {
      setDeleteResourceTarget(null);
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "communityResources",
          resource.id
        )
      );

      setCommunityResources((prev) =>
        prev.filter(
          (item) => item.id !== resource.id
        )
      );

      await setDoc(
        doc(db, "users", authUser.uid),
        {
          resourcesShared: increment(-1),
        },
        { merge: true }
      );

      setActivityData((prev) => ({
        ...prev,
        resourcesShared: Math.max(
          0,
          prev.resourcesShared - 1
        ),
      }));

      setDeleteResourceTarget(null);

      showActionToast(
        "Resource deleted successfully."
      );
    } catch (error) {
      console.error(
        "COMMUNITY RESOURCE DELETE ERROR:",
        error
      );

      setDeleteResourceTarget(null);

      showActionToast(
        "Unable to delete the resource. Please try again."
      );
    }
  };

const handleNavigation = (id) => {
  setActiveNav(id);
  setProfilePageOpen(false);
  navigationLockUntilRef.current = Date.now() + 1200;

  const element = document.getElementById(id);
  if (!element) return;

  requestAnimationFrame(() => {
    const isCompactViewport =
      typeof window !== "undefined" &&
      window.matchMedia?.("(max-width: 820px)")?.matches;

    if (isCompactViewport) {
      // The app stylesheet enables smooth scrolling on <html>. With
      // scrollIntoView({ behavior: "auto" }), that CSS rule can still make
      // mobile sidebar navigation animate slowly. Temporarily disable the
      // CSS smooth-scroll rule for this single navigation action so the
      // section change starts immediately on phones/tablets. Desktop keeps
      // the existing smooth navigation exactly as before.
      const root = document.documentElement;
      const body = document.body;
      const previousRootBehavior = root.style.scrollBehavior;
      const previousBodyBehavior = body?.style.scrollBehavior || "";

      root.style.scrollBehavior = "auto";
      if (body) body.style.scrollBehavior = "auto";

      element.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      root.style.scrollBehavior = previousRootBehavior;
      if (body) body.style.scrollBehavior = previousBodyBehavior;
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};

useEffect(() => {
  if (!authUser || profilePageOpen) return undefined;

  const sectionIds = ["home", "hackathons", "teams", "messages", "resources"];
  const updateActiveSection = () => {
    if (Date.now() < navigationLockUntilRef.current) return;

    const marker = window.scrollY + Math.min(170, window.innerHeight * 0.24);
    let current = "home";
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= marker) current = id;
    });

    setActiveNav((previous) => previous === current ? previous : current);
  };

  updateActiveSection();
  window.addEventListener("scroll", updateActiveSection, { passive: true });
  window.addEventListener("resize", updateActiveSection);
  return () => {
    window.removeEventListener("scroll", updateActiveSection);
    window.removeEventListener("resize", updateActiveSection);
  };
}, [authUser, profilePageOpen]);

const getDirectConversationId = (otherUserId) => {
  if (!authUser?.uid || !otherUserId) return null;
  return `dm_${[authUser.uid, otherUserId].sort().join("_")}`;
};

const getTimestampMillis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return 0;
};

const getPendingDirectMessageRequest = (studentId) =>
  directMessageRequests.find((request) =>
    request.status === "pending" &&
    ((request.senderId === authUser?.uid && request.recipientId === studentId) ||
      (request.senderId === studentId && request.recipientId === authUser?.uid))
  );

const getDirectParticipantDisplayName = (participantId, fallback = "") => {
  const currentProfile = directParticipantProfiles[participantId] ||
    teammates.find((person) => person.id === participantId);
  return currentProfile?.name || fallback || "CIT Student";
};

const getDirectOtherParticipant = (conversation) => {
  if (!conversation || !authUser?.uid) return null;

  const index = Array.isArray(conversation.memberIds)
    ? conversation.memberIds.findIndex((id) => id !== authUser.uid)
    : -1;

  if (index < 0) return null;

  const participantId = conversation.memberIds[index];
  const savedConversationProfile = conversation.memberProfiles?.[index] || {};
  const currentProfile = directParticipantProfiles[participantId] ||
    teammates.find((person) => person.id === participantId);

  // Older conversations retain the name captured when they were first opened.
  // Prefer the current users/{uid} profile whenever available, falling back to
  // the saved snapshot only if the profile cannot be resolved.
  return {
    ...savedConversationProfile,
    ...(currentProfile || {}),
    id: participantId,
    name: currentProfile?.name || savedConversationProfile.name || "CIT Student",
    campusConnectId: currentProfile?.campusConnectId || savedConversationProfile.campusConnectId || "",
  };
};

const openDirectConversation = async (student) => {
  if (!authUser || !student?.id || student.id === authUser.uid) return;

  const conversationId = getDirectConversationId(student.id);
  const isConnected = Boolean(getConnectionForStudent(student.id));

  // Only connected students can start a normal DM. Anyone else must request access,
  // even if a legacy conversation shell already exists in Firestore.
  if (!isConnected) {
    const existingRequest = getPendingDirectMessageRequest(student.id);
    setSelectedStudent(null);
    setSearchOpen(false);
    setActiveNav("messages");

    requestAnimationFrame(() => {
      document.getElementById("messages")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    if (existingRequest) {
      showActionToast(
        existingRequest.senderId === authUser.uid
          ? "Your message request is still pending."
          : "This student has already sent you a message request. Check Message Requests."
      );
      return;
    }

    setMessageRequestTarget(student);
    setMessageRequestDraft("");
    return;
  }

  setDirectMessageOpening(true);

  try {
    const memberIds = [authUser.uid, student.id].sort();
    const memberProfiles = memberIds.map((id) => {
      if (id === authUser.uid) {
        return {
          id,
          name: profileData.name || authUser.displayName || "CIT Student",
          campusConnectId: profileData.campusConnectId || "",
        };
      }

      return {
        id,
        name: student.name || "CIT Student",
        campusConnectId: student.campusConnectId || "",
      };
    });

    const conversationRef = doc(db, "directConversations", conversationId);
    const existingSnapshot = await getDoc(conversationRef);
    let conversationData = {};

    if (!existingSnapshot.exists()) {
      const newConversationData = {
        memberIds,
        memberProfiles,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(conversationRef, newConversationData);
      conversationData = newConversationData;
    } else {
      conversationData = existingSnapshot.data() || {};
    }

    setDirectConversation({
      id: conversationId,
      ...conversationData,
      memberIds,
      memberProfiles: conversationData.memberProfiles || memberProfiles,
    });
    setSelectedStudent(null);
    setSearchOpen(false);
    setActiveNav("messages");

    requestAnimationFrame(() => {
      document.getElementById("messages")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  } catch (error) {
    console.error("DIRECT MESSAGE OPEN ERROR:", error);
    showActionToast("Unable to open this conversation. Please try again.");
  } finally {
    setDirectMessageOpening(false);
  }
};

const submitDirectMessageRequest = async () => {
  if (!authUser || !messageRequestTarget?.id || messageRequestSending) return;

  const message = messageRequestDraft.trim();
  if (!message) {
    showActionToast("Add a short message to send your request.");
    return;
  }
  if (message.length > 2000) {
    showActionToast("Message requests can be up to 2000 characters.");
    return;
  }

  const recipientId = messageRequestTarget.id;
  const pendingRequest = getPendingDirectMessageRequest(recipientId);
  if (pendingRequest) {
    showActionToast("A message request between you is already pending.");
    setMessageRequestTarget(null);
    return;
  }

  setMessageRequestSending(true);
  try {
    const recipientSnap = await getDoc(doc(db, "users", recipientId));
    if (!recipientSnap.exists()) {
      showActionToast("This student's profile could not be found.");
      return;
    }

    const recipientData = recipientSnap.data() || {};
    const recipientBlockedIds = Array.isArray(recipientData.blockedUserIds)
      ? recipientData.blockedUserIds
      : [];
    if (recipientBlockedIds.includes(authUser.uid)) {
      showActionToast("You cannot send a message request to this student because they have blocked you.");
      setMessageRequestTarget(null);
      return;
    }

    if (getConnectionForStudent(recipientId)) {
      setMessageRequestTarget(null);
      await openDirectConversation({
        ...messageRequestTarget,
        name: messageRequestTarget.name || recipientData.name || "CIT Student",
      });
      return;
    }

    const requestRef = await addDoc(collection(db, "directMessageRequests"), {
      senderId: authUser.uid,
      senderName: profileData.name || authUser.displayName || "CIT Student",
      senderCampusConnectId: profileData.campusConnectId || "",
      recipientId,
      recipientName: recipientData.name || messageRequestTarget.name || "CIT Student",
      recipientCampusConnectId: recipientData.campusConnectId || messageRequestTarget.campusConnectId || "",
      message,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    try {
      await addDoc(collection(db, "notifications"), {
        recipientId,
        actorId: authUser.uid,
        actorName: profileData.name || authUser.displayName || "CIT Student",
        type: "direct_message_request",
        title: "New message request",
        message: `${profileData.name || "A CIT student"} wants to message you.`,
        relatedId: requestRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (notificationError) {
      // The request itself is already saved; a notification failure must not
      // leave the composer open and invite the student to submit a duplicate.
      console.error("MESSAGE REQUEST NOTIFICATION ERROR:", notificationError);
    }

    setMessageRequestTarget(null);
    setMessageRequestDraft("");
    showActionToast("Message request sent. It will appear in their Message Requests section.");
  } catch (error) {
    console.error("DIRECT MESSAGE REQUEST ERROR:", error);
    showActionToast(
      error?.code === "permission-denied"
        ? "Firebase denied this request. Check that the latest Firestore rules are published."
        : "Unable to send the message request. Please try again."
    );
  } finally {
    setMessageRequestSending(false);
  }
};

const respondToDirectMessageRequest = async (request, decision) => {
  if (
    !authUser ||
    !request?.id ||
    request.recipientId !== authUser.uid ||
    request.status !== "pending" ||
    !["accepted", "declined"].includes(decision) ||
    messageRequestActionLoading
  ) {
    return;
  }

  if (decision === "accepted" && blockedUserIds.includes(request.senderId)) {
    showActionToast("Unblock this student before accepting their message request.");
    return;
  }

  setMessageRequestActionLoading(true);
  try {
    const requestRef = doc(db, "directMessageRequests", request.id);
    const senderId = request.senderId;
    const userIds = [senderId, authUser.uid].sort();
    const connectionId = `${userIds[0]}_${userIds[1]}`;
    const conversationId = getDirectConversationId(senderId);
    const batch = writeBatch(db);

    batch.update(requestRef, {
      status: decision,
      respondedAt: serverTimestamp(),
    });

    if (decision === "accepted") {
      // Only fetch the sender's user profile here. The connection and conversation
      // documents may not exist yet; their Firestore read rules intentionally check
      // participant fields on existing documents, so getDoc() on a missing document
      // can fail with permission-denied before this batch is committed. We already
      // maintain live, participant-scoped lists for existing connections/chats.
      const senderSnap = await getDoc(doc(db, "users", senderId));
      const senderData = senderSnap.exists() ? senderSnap.data() || {} : {};
      const existingConnection = connections.find((item) =>
        Array.isArray(item.userIds) &&
        item.userIds.includes(senderId) &&
        item.userIds.includes(authUser.uid)
      );
      const existingConversation = directConversations.find(
        (item) => item.id === conversationId
      );
      const memberProfiles = userIds.map((id) => id === authUser.uid
        ? {
            id,
            name: profileData.name || authUser.displayName || "CIT Student",
            campusConnectId: profileData.campusConnectId || "",
          }
        : {
            id,
            name: senderData.name || request.senderName || "CIT Student",
            campusConnectId: senderData.campusConnectId || request.senderCampusConnectId || "",
          }
      );

      if (!existingConnection) {
        batch.set(doc(db, "connections", connectionId), {
          userIds,
          userA: userIds[0],
          userB: userIds[1],
          createdAt: serverTimestamp(),
          sourceRequestId: request.id,
          sourceRequestType: "directMessageRequest",
        });
      }

      const conversationData = {
        memberIds: userIds,
        memberProfiles: existingConversation?.memberProfiles || memberProfiles,
        lastMessage: request.message,
        lastMessageAt: serverTimestamp(),
        lastSenderId: senderId,
        updatedAt: serverTimestamp(),
        unreadCounts: {
          [authUser.uid]: 0,
          [senderId]: 0,
        },
      };
      if (!existingConversation) conversationData.createdAt = serverTimestamp();

      batch.set(doc(db, "directConversations", conversationId), conversationData, { merge: true });
      batch.set(doc(db, "directConversations", conversationId, "messages", `request_${request.id}`), {
        conversationId,
        senderId,
        recipientId: authUser.uid,
        message: request.message,
        media: [],
        senderName: request.senderName || senderData.name || "CIT Student",
        createdAt: serverTimestamp(),
        isMessageRequestIntro: true,
        sourceMessageRequestId: request.id,
      });
    }

    batch.set(doc(db, "notifications", `${request.id}_${decision}`), {
      recipientId: senderId,
      actorId: authUser.uid,
      actorName: profileData.name || authUser.displayName || "CIT Student",
      type: decision === "accepted" ? "direct_message_request_accepted" : "direct_message_request_declined",
      title: decision === "accepted" ? "Message request accepted" : "Message request declined",
      message: decision === "accepted"
        ? `${profileData.name || "A CIT student"} accepted your message request and connected with you.`
        : `${profileData.name || "A CIT student"} declined your message request.`,
      relatedId: request.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    setReceivedDirectMessageRequests((prev) => prev.map((item) =>
      item.id === request.id ? { ...item, status: decision } : item
    ));

    if (decision === "accepted") {
      setConnections((prev) => prev.some((item) => item.id === connectionId)
        ? prev
        : [...prev, { id: connectionId, userIds, sourceRequestId: request.id, sourceRequestType: "directMessageRequest", createdAt: new Date() }]
      );
      const conversation = {
        id: conversationId,
        memberIds: userIds,
        memberProfiles: userIds.map((id) => id === authUser.uid
          ? { id, name: profileData.name || "CIT Student", campusConnectId: profileData.campusConnectId || "" }
          : { id, name: request.senderName || "CIT Student", campusConnectId: request.senderCampusConnectId || "" }
        ),
        lastMessage: request.message,
        lastSenderId: senderId,
      };
      setDirectConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversationId)]);
      setDirectConversation(conversation);
      showActionToast(`Request accepted. You are now connected with ${request.senderName || "this student"}.`);
    } else {
      showActionToast("Message request declined.");
    }
  } catch (error) {
    console.error("RESPOND TO DIRECT MESSAGE REQUEST ERROR:", error);
    showActionToast(
      error?.code === "permission-denied"
        ? "Firebase denied this action. Check that the updated Firestore rules are published."
        : "Unable to update this message request. Please try again."
    );
  } finally {
    setMessageRequestActionLoading(false);
  }
};

const getDirectConversationTarget = (conversation = directConversation) => {
  const other = getDirectOtherParticipant(conversation);
  return other?.id ? { id: other.id, name: other.name || "CIT Student" } : null;
};

// Connected students who do not already have an active visible conversation.
// Existing conversations remain in the Conversations list below, so together
// these two sections cover every current connection without unnecessary duplicates.
const connectedStudentsForMessages = useMemo(() => {
  if (!authUser?.uid) return [];

  const activeConversationParticipantIds = new Set(
    directConversations
      .map((conversation) =>
        Array.isArray(conversation.memberIds)
          ? conversation.memberIds.find((id) => id !== authUser.uid)
          : null
      )
      .filter(Boolean)
  );

  return connections
    .map((connection) => {
      const otherId = Array.isArray(connection.userIds)
        ? connection.userIds.find((id) => id !== authUser.uid)
        : null;
      if (!otherId) return null;

      const person = directParticipantProfiles[otherId] || teammates.find((item) => item.id === otherId);
      return person || {
        id: otherId,
        name: "Connected Student",
        campusConnectId: "",
      };
    })
    .filter(Boolean)
    .filter((person) => !activeConversationParticipantIds.has(person.id))
    .sort((a, b) =>
      (a.name || "Connected Student").localeCompare(
        b.name || "Connected Student",
        undefined,
        { sensitivity: "base" }
      )
    );
}, [connections, teammates, directParticipantProfiles, directConversations, blockedUserIds, authUser?.uid]);

const requestDirectConversationAction = (action) => {
  const target = getDirectConversationTarget();
  if (!target) return;
  setDirectConversationMenu(false);
  setDirectConversationConfirm({
    action,
    userId: target.id,
    userName: target.name,
  });
};

const executeDirectConversationAction = async () => {
  if (!authUser || !directConversationConfirm?.userId) return;

  const { action, userId, userName } = directConversationConfirm;

  try {
    if (action === "block") {
      await updateDoc(doc(db, "users", authUser.uid), {
        blockedUserIds: arrayUnion(userId),
      });
      setBlockedUserIds((prev) => prev.includes(userId) ? prev : [...prev, userId]);
      setDirectConversationConfirm(null);
      setDirectConversationMenu(false);
      setDirectConversation(null);
      setDirectMessages([]);
      setDirectMessageInput("");
      showActionToast(`${userName} has been blocked.`);
      return;
    }

    if (action === "unblock") {
      await updateDoc(doc(db, "users", authUser.uid), {
        blockedUserIds: arrayRemove(userId),
      });
      setBlockedUserIds((prev) => prev.filter((id) => id !== userId));
      setDirectConversationConfirm(null);
      showActionToast(`${userName} has been unblocked.`);
      return;
    }

    if (action === "delete") {
      const conversationId = directConversation?.id;
      if (!conversationId) return;

      const clearedAt = new Date();
      const ownProfileRef = doc(db, "users", authUser.uid);
      await updateDoc(ownProfileRef, {
        [`clearedDirectConversationAt.${conversationId}`]: serverTimestamp(),
        hiddenDirectConversationIds: arrayRemove(conversationId),
      });
      let savedClearedAt = clearedAt;
      try {
        const refreshedProfile = await getDoc(ownProfileRef);
        savedClearedAt = refreshedProfile.data()?.clearedDirectConversationAt?.[conversationId] || clearedAt;
      } catch (timestampReadError) {
        console.warn("Unable to refresh the saved clear timestamp; using the local timestamp.", timestampReadError);
      }
      setClearedDirectConversationAt((prev) => ({
        ...prev,
        [conversationId]: savedClearedAt,
      }));
      setDirectConversations((prev) =>
        prev.filter((conversation) => conversation.id !== conversationId)
      );
      setDirectConversationConfirm(null);
      setDirectConversationMenu(false);
      setDirectConversation(null);
      setDirectMessages([]);
      setDirectMessageInput("");
      setDirectMessageMediaFiles([]);
      showActionToast("Conversation cleared for you. Earlier messages are hidden from your history.");
    }
  } catch (error) {
    console.error("DIRECT CONVERSATION ACTION ERROR:", error);
    showActionToast(
      action === "block"
        ? "Unable to block this student."
        : action === "unblock"
          ? "Unable to unblock this student."
          : "Unable to clear this conversation."
    );
  }
};

const handleDirectMessageMediaFiles = (fileList) => {
  const files = Array.from(fileList || []);

  if (!files.length) return;

  if (files.length > 3) {
    setDirectMessageMediaFiles([]);
    showActionToast("You can send up to 3 images per message.", "error");
    return;
  }

  const invalid = files.find(
    (file) => !file.type?.startsWith("image/") || file.size > 4 * 1024 * 1024
  );

  if (invalid) {
    setDirectMessageMediaFiles([]);
    showActionToast("Only images up to 4 MB each are allowed.", "error");
    return;
  }

  setDirectMessageMediaFiles(files);
};

const uploadDirectMessageImages = async (files) => {
  const imageKitAuth = await getImageKitAuth(authUser);
  const uploadedImages = [];

  for (const file of files) {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${authUser.uid}-${Date.now()}-${safeFileName}`;

    const uploaded = await imageKitUpload({
      file,
      fileName,
      publicKey: imageKitAuth.publicKey,
      signature: imageKitAuth.signature,
      token: imageKitAuth.token,
      expire: imageKitAuth.expire,
      folder: `/campusconnect/direct-messages/${authUser.uid}`,
      useUniqueFileName: true,
    });

    uploadedImages.push({
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
      fileId: uploaded.fileId || "",
      fileName: file.name,
    });
  }

  return uploadedImages;
};

const sendDirectMessage = async () => {
  if (!authUser || !directConversation?.id || directMessageSending) return;

  const message = directMessageInput.trim();
  const mediaFiles = directMessageMediaFiles;

  if (!message && mediaFiles.length === 0) return;

  if (message.length > 2000) {
    showActionToast("Messages can be up to 2000 characters.");
    return;
  }

  const otherParticipant = getDirectOtherParticipant(directConversation);
  if (!otherParticipant?.id) return;

  if (!getConnectionForStudent(otherParticipant.id)) {
    showActionToast("You are not connected with this student. Open their profile to send a message request.");
    return;
  }

  try {
    const recipientSnap = await getDoc(doc(db, "users", otherParticipant.id));
    const recipientBlockedIds = Array.isArray(recipientSnap.data()?.blockedUserIds)
      ? recipientSnap.data().blockedUserIds
      : [];

    if (recipientBlockedIds.includes(authUser.uid)) {
      showActionToast("You cannot message this student because they have blocked you.");
      return;
    }
  } catch (error) {
    console.error("DIRECT MESSAGE BLOCK CHECK ERROR:", error);
    showActionToast("Unable to verify messaging permissions. Please try again.");
    return;
  }

  setDirectMessageSending(true);

  try {
    const uploadedMedia = mediaFiles.length
      ? await uploadDirectMessageImages(mediaFiles)
      : [];

    const lastMessage = message || `📷 ${uploadedMedia.length} image${uploadedMedia.length === 1 ? "" : "s"}`;

    await addDoc(
      collection(
        db,
        "directConversations",
        directConversation.id,
        "messages"
      ),
      {
        conversationId: directConversation.id,
        senderId: authUser.uid,
        recipientId: otherParticipant.id,
        message,
        media: uploadedMedia,
        senderName: profileData.name || authUser.displayName || "CIT Student",
        createdAt: serverTimestamp(),
      }
    );

    await updateDoc(
      doc(db, "directConversations", directConversation.id),
      {
        lastMessage,
        lastMessageAt: serverTimestamp(),
        lastSenderId: authUser.uid,
        updatedAt: serverTimestamp(),
        [`unreadCounts.${otherParticipant.id}`]: increment(1),
        [`unreadCounts.${authUser.uid}`]: 0,
      }
    );

    setDirectMessageInput("");
    setDirectMessageMediaFiles([]);
  } catch (error) {
    console.error("DIRECT MESSAGE SEND ERROR:", error);
    showActionToast("Unable to send the message. Please try again.");
  } finally {
    setDirectMessageSending(false);
  }
};

const submitDirectMessageReport = async () => {
  const target = directMessageReportTarget;
  if (
    !authUser ||
    !directConversation?.id ||
    !target?.id ||
    !target.senderId ||
    target.senderId === authUser.uid ||
    !directMessageReportReason ||
    directMessageReportSubmitting
  ) {
    return;
  }

  setDirectMessageReportSubmitting(true);

  try {
    await addDoc(collection(db, "directMessageReports"), {
      conversationId: directConversation.id,
      messageId: target.id,
      reportedUserId: target.senderId,
      reporterId: authUser.uid,
      reason: directMessageReportReason,
      description: directMessageReportDescription.trim().slice(0, 1000),
      message: target.message || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setDirectMessageReportTarget(null);
    setDirectMessageReportReason("");
    setDirectMessageReportDescription("");
    showActionToast("Report submitted. Thank you for helping keep messages safe.");
  } catch (error) {
    console.error("DIRECT MESSAGE REPORT ERROR:", error);

    if (error?.code === "permission-denied") {
      showActionToast(
        "Firebase denied the report. Make sure the latest Firestore rules are published."
      );
    } else {
      showActionToast("Unable to submit the report. Please try again.");
    }
  } finally {
    setDirectMessageReportSubmitting(false);
  }
};

const closeDirectConversation = () => {
  setDirectConversation(null);
  setDirectMessages([]);
  setDirectMessageInput("");
  setDirectMessageMediaFiles([]);
  setDirectConversationMenu(false);
};



  useEffect(() => {
    let cancelled = false;
    const loadHackathonInterests = async () => {
      if (!authUser) { setHackathonInterestIds(new Set()); return; }
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "hackathonInterests"),
            where("userId", "==", authUser.uid)
          )
        );
        const ids = new Set();
        snapshot.forEach((item) => {
          const data = item.data();
          if (data.hackathonId) ids.add(data.hackathonId);
        });
        if (!cancelled) setHackathonInterestIds(ids);
      } catch (error) { console.error("HACKATHON INTEREST LOAD ERROR:", error); }
    };
    loadHackathonInterests();
    return () => { cancelled = true; };
  }, [authUser]);

  const toggleHackathonInterest = async (hackathon) => {
    if (!authUser) { showActionToast("Please sign in to save your interest."); return; }
    const hackathonId = hackathon?.id;
    if (!hackathonId) { showActionToast("This hackathon is missing its Firebase ID."); return; }
    const interestRef = doc(db, "hackathonInterests", `${authUser.uid}_${hackathonId}`);
    const isInterested = hackathonInterestIds.has(hackathonId);
    setHackathonInterestLoading(true);
    try {
      if (isInterested) {
        await deleteDoc(interestRef);
        setHackathonInterestIds((prev) => { const next = new Set(prev); next.delete(hackathonId); return next; });
        showActionToast("Removed from your interested hackathons.");
      } else {
        await setDoc(interestRef, {
          userId: authUser.uid,
          userName: profileData.name || authUser.email || "CIT Student",
          hackathonId,
          hackathonName: hackathon.name || "Hackathon",
          createdAt: serverTimestamp(),
        });
        setHackathonInterestIds((prev) => { const next = new Set(prev); next.add(hackathonId); return next; });
        showActionToast("Hackathon saved to your interests!");
      }
    } catch (error) {
      console.error("HACKATHON INTEREST ERROR:", error);
      showActionToast("Unable to update your interest. Please try again.");
    } finally { setHackathonInterestLoading(false); }
  };

const handleCreateTeam = async (e) => {
  e.preventDefault();

  if (!authUser) {
    showActionToast("Please sign in before creating a team.");
    return;
  }

  const form = e.currentTarget;
  const formData = new FormData(form);

  const title = formData.get("title")?.toString().trim();
  const idea = formData.get("idea")?.toString().trim();
  const skills = formData.get("skills")?.toString().trim();
  const members = formData.get("members")?.toString().trim();

  if (!title || !idea || !skills || !members) {
    return;
  }

  try {
    const teamConnectId = generateTeamConnectId();
    const teamData = {
      title,
      idea,
      skills,
      members: Number(members),
      createdBy: authUser.uid,
      createdByName: profileData.name || authUser.email || "CIT Student",
      createdAt: serverTimestamp(),
      status: "Open",
      memberIds: [authUser.uid],
      teamConnectId,
    };

    const createdTeamRef = doc(collection(db, "teams"));
    await setDoc(createdTeamRef, teamData);
    const createdTeamRecord = { id: createdTeamRef.id, ...teamData };

    setAllTeams((prev) => [createdTeamRecord, ...prev.filter((team) => team.id !== createdTeamRecord.id)]);
    setUserTeams((prev) => [createdTeamRecord, ...prev.filter((team) => team.id !== createdTeamRecord.id)]);

    await setDoc(
      doc(db, "users", authUser.uid),
      {
        teamsCreated: increment(1),
      },
      { merge: true }
    );

    setCreatedTeam({
      title,
      idea,
      skills,
      members,
      teamConnectId,
    });

    setTeamCreated(true);
    setActivityData((prev) => ({
      ...prev,
      teamsCreated: prev.teamsCreated + 1,
    }));

    setDashboardStats((prev) => ({
      ...prev,
      teamsFormed: prev.teamsFormed + 1,
    }));

    showActionToast("Team created and saved to CampusConnect!");
    form.reset();
  } catch (error) {
    console.error("TEAM CREATION ERROR:", error);
    showActionToast("Unable to create the team. Please try again.");
  }
};

const getConnectionForStudent = (studentId) => {

  return connections.find((connection) =>
    Array.isArray(connection.userIds) && connection.userIds.includes(studentId)
  );
};
const removeConnection = async (connection) => {
  if (!authUser || !connection?.id) return;

  const otherId = connection.userIds?.find(
    (id) => id !== authUser.uid
  );

  const person = teammates.find(
    (item) => item.id === otherId
  );

  setConnectionRemoveTarget({
    connection,
    otherId,
    personName: person?.name || "this student",
  });
};
const confirmRemoveConnection = async () => {
  if (!authUser || !connectionRemoveTarget?.connection?.id) return;

  const {
    connection,
    otherId,
    personName,
  } = connectionRemoveTarget;

  setConnectionActionLoading(true);

  try {
    await deleteDoc(
      doc(db, "connections", connection.id)
    );

    setConnections((prev) =>
      prev.filter((item) => item.id !== connection.id)
    );

    if (otherId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: otherId,
        actorId: authUser.uid,
        actorName:
          profileData.name ||
          authUser.email ||
          "CIT Student",
        type: "connection_removed",
        title: "Connection removed",
        message: `${profileData.name || "A student"} removed you from their connections.`,
        relatedId: connection.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    setConnectionRemoveTarget(null);

    showActionToast(
      `${personName} was removed from your connections.`
    );
  } catch (error) {
    console.error("REMOVE CONNECTION ERROR:", error);

    showActionToast(
      "Unable to remove the connection. Please try again."
    );
  } finally {
    setConnectionActionLoading(false);
  }
};

const getPendingConnectionRequest = (studentId) => {
  return connectionRequests.find((request) => {
    const involvesStudent = request.senderId === studentId || request.receiverId === studentId;
    return involvesStudent && request.status === "pending";
  });
};

const getIncomingConnectionRequest = (studentId) => {
  return connectionRequests.find(
    (request) =>
      request.senderId === studentId &&
      request.receiverId === authUser?.uid &&
      request.status === "pending"
  );
};

const cancelConnectionRequest = async (request) => {
  if (!authUser || !request?.id || request.senderId !== authUser.uid || request.status !== "pending") {
    return;
  }

  setConnectionActionLoading(true);

  try {
    await deleteDoc(doc(db, "connectionRequests", request.id));

    setConnectionRequests((prev) =>
      prev.filter((item) => item.id !== request.id)
    );

    setConnectionRequestCancelTarget(null);
    showActionToast("Connection request cancelled.");
  } catch (error) {
    console.error("CANCEL CONNECTION REQUEST ERROR:", error);
    showActionToast("Unable to cancel the connection request. Please try again.");
  } finally {
    setConnectionActionLoading(false);
  }
};

const sendConnectionRequest = async (student) => {
  if (!authUser || !student?.id || student.id === authUser.uid) return;

  if (getConnectionForStudent(student.id)) {
    showActionToast("You are already connected with this student.");
    return;
  }

  const existing = getPendingConnectionRequest(student.id);
  if (existing) {
    showActionToast(
      existing.senderId === authUser.uid
        ? "Connection request already sent."
        : "This student has already sent you a request. Check Notifications."
    );
    return;
  }

  setConnectionActionLoading(true);
  try {
    const requestRef = await addDoc(collection(db, "connectionRequests"), {
      senderId: authUser.uid,
      senderName: profileData.name || authUser.email || "CIT Student",
      senderCampusConnectId: profileData.campusConnectId || "",
      receiverId: student.id,
      receiverName: student.name || "CIT Student",
      receiverCampusConnectId: student.campusConnectId || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      recipientId: student.id,
      actorId: authUser.uid,
      actorName: profileData.name || authUser.email || "CIT Student",
      type: "connection_request",
      title: "New connection request",
      message: `${profileData.name || "A CIT student"} wants to connect with you.`,
      relatedId: requestRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    setConnectionRequests((prev) => [
      ...prev,
      {
        id: requestRef.id,
        senderId: authUser.uid,
        senderName: profileData.name || authUser.email || "CIT Student",
        receiverId: student.id,
        receiverName: student.name || "CIT Student",
        status: "pending",
      },
    ]);

    showActionToast(`Connection request sent to ${student.name}!`);
  } catch (error) {
    console.error("CONNECTION REQUEST ERROR:", error);
    showActionToast("Unable to send the connection request.");
  } finally {
    setConnectionActionLoading(false);
  }
};

const respondToConnectionRequest = async (request, decision) => {
  if (!authUser || request.receiverId !== authUser.uid) return;

  setConnectionActionLoading(true);
  try {
    await updateDoc(doc(db, "connectionRequests", request.id), {
      status: decision,
      respondedAt: serverTimestamp(),
    });

    if (decision === "accepted") {
      const userIds = [request.senderId, request.receiverId].sort();
      const connectionId = `${userIds[0]}_${userIds[1]}`;

      await setDoc(doc(db, "connections", connectionId), {
        userIds,
        userA: userIds[0],
        userB: userIds[1],
        createdAt: serverTimestamp(),
        sourceRequestId: request.id,
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: request.senderId,
        actorId: authUser.uid,
        actorName: profileData.name || authUser.email || "CIT Student",
        type: "connection_accepted",
        title: "Connection request accepted",
        message: `${profileData.name || "A student"} accepted your connection request.`,
        relatedId: connectionId,
        read: false,
        createdAt: serverTimestamp(),
      });

      setConnections((prev) => [
        ...prev,
        { id: connectionId, userIds, createdAt: new Date() },
      ]);
      showActionToast(`You are now connected with ${request.senderName || "this student"}.`);
    } else {
      await addDoc(collection(db, "notifications"), {
        recipientId: request.senderId,
        actorId: authUser.uid,
        actorName: profileData.name || authUser.email || "CIT Student",
        type: "connection_declined",
        title: "Connection request declined",
        message: `${profileData.name || "The student"} declined your connection request.`,
        relatedId: request.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      showActionToast("Connection request declined.");
    }

    setConnectionRequests((prev) =>
      prev.map((item) => item.id === request.id ? { ...item, status: decision } : item)
    );
  } catch (error) {
    console.error("CONNECTION RESPONSE ERROR:", error);
    showActionToast("Unable to update the connection request.");
  } finally {
    setConnectionActionLoading(false);
  }
};

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return "Just now";

  let date = null;

  if (typeof timestamp?.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "Just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

const markNotificationRead = async (notification) => {
  if (!notification?.id || notification.read) return;
  try {
    await updateDoc(doc(db, "notifications", notification.id), { read: true });
    setNotifications((prev) => prev.map((item) =>
      item.id === notification.id ? { ...item, read: true } : item
    ));
  } catch (error) {
    console.error("NOTIFICATION READ ERROR:", error);
  }
};

const openNotifications = async () => {
  const shouldOpen = !notificationOpen;
  setNotificationOpen(shouldOpen);

  if (!shouldOpen) return;

  const unreadNotifications = notifications.filter((item) => !item.read);
  if (unreadNotifications.length === 0) return;

  // Opening the notification panel counts as viewing the notifications.
  // Mark them read in Firestore so the unread indicator disappears and
  // stays gone after a refresh. A later new notification will be unread again.
  try {
    await Promise.all(
      unreadNotifications.map((notification) =>
        updateDoc(doc(db, "notifications", notification.id), { read: true })
      )
    );

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );
  } catch (error) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);
  }
};

const clearNotifications = async () => {
  if (!authUser || notifications.length === 0 || notificationClearLoading) return;

  setNotificationClearLoading(true);
  try {
    const validNotifications = notifications.filter((notification) => notification?.id);

    // Firestore batches have a 500-operation limit. Clear in safe chunks so
    // old notification history can be removed even if the list grows large.
    for (let start = 0; start < validNotifications.length; start += 450) {
      const batch = writeBatch(db);
      validNotifications.slice(start, start + 450).forEach((notification) => {
        batch.delete(doc(db, "notifications", notification.id));
      });
      await batch.commit();
    }

    setNotifications([]);
    showActionToast("Notifications cleared.");
  } catch (error) {
    console.error("CLEAR NOTIFICATIONS ERROR:", error);
    showActionToast("Unable to clear notifications. Please try again.");
  } finally {
    setNotificationClearLoading(false);
  }
};

const scrollToPageTop = () => {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
};

const joinTeam = async (team) => {
  if (!authUser || !team?.id) return;

  if (team.createdBy === authUser.uid) {
    showActionToast("You already own this team.");
    return;
  }

  if (userTeams.some((item) => item.id === team.id)) {
    showActionToast("You are already a member of this team.");
    return;
  }

  const membershipId = `${team.id}_${authUser.uid}`;
  const teamRef = doc(db, "teams", team.id);
  const membershipRef = doc(db, "teamMemberships", membershipId);

  setTeamActionLoading(true);

  try {
    let joinedTeamData = null;

    await runTransaction(db, async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const membershipSnap = await transaction.get(membershipRef);

      if (!teamSnap.exists()) {
        throw new Error("TEAM_NOT_FOUND");
      }

      if (membershipSnap.exists()) {
        throw new Error("ALREADY_MEMBER");
      }

      const currentTeam = {
        id: teamSnap.id,
        ...teamSnap.data(),
      };

      // Ignore this user's stale memberIds entry when no real
      // teamMemberships document exists.
      const currentMemberIds = Array.isArray(currentTeam.memberIds)
        ? currentTeam.memberIds.filter(
            (id) => id !== authUser.uid
          )
        : [currentTeam.createdBy].filter(
            (id) => id !== authUser.uid
          );

      const blockedMemberIds = Array.isArray(currentTeam.blockedMemberIds)
        ? currentTeam.blockedMemberIds
        : [];

      const maxMembers = Number(currentTeam.members) || 1;

      if (blockedMemberIds.includes(authUser.uid)) {
        throw new Error("TEAM_BLOCKED");
      }

      if (currentMemberIds.includes(authUser.uid)) {
        throw new Error("ALREADY_MEMBER");
      }

      if (currentMemberIds.length >= maxMembers) {
        throw new Error("TEAM_FULL");
      }

      const nextMemberIds = Array.from(
        new Set([...currentMemberIds, authUser.uid].filter(Boolean))
      );

      const nextStatus =
        nextMemberIds.length >= maxMembers ? "Full" : "Open";

      transaction.update(teamRef, {
        memberIds: nextMemberIds,
        status: nextStatus,
      });

      transaction.set(membershipRef, {
        teamId: team.id,
        teamTitle: currentTeam.title || team.title || "Hackathon Team",
        memberId: authUser.uid,
        memberName:
          profileData.name || authUser.email || "CIT Student",
        role: "member",
        joinedAt: serverTimestamp(),
      });

      joinedTeamData = {
        ...currentTeam,
        memberIds: nextMemberIds,
        status: nextStatus,
      };
    });

    const joinedTeam = {
      ...team,
      ...joinedTeamData,
    };

    setTeamMemberships((prev) => [
      ...prev.filter((item) => item.id !== membershipId),
      {
        id: membershipId,
        teamId: team.id,
        teamTitle: team.title || "Hackathon Team",
        memberId: authUser.uid,
        memberName:
          profileData.name || authUser.email || "CIT Student",
        role: "member",
      },
    ]);

    setAllTeams((prev) =>
      prev.map((item) => (item.id === team.id ? joinedTeam : item))
    );

    setUserTeams((prev) => [
      ...prev.filter((item) => item.id !== team.id),
      joinedTeam,
    ]);

    // Notify the team owner. A notification failure must not undo
    // an already-successful team join.
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: team.createdBy,
        actorId: authUser.uid,
        actorName:
          profileData.name || authUser.email || "CIT Student",
        type: "team_member_joined",
        title: "New team member",
        message: `${
          profileData.name || "A student"
        } joined ${
          team.title || "your team"
        }.`,
        relatedId: team.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (notificationError) {
      console.error(
        "TEAM JOIN NOTIFICATION ERROR:",
        notificationError
      );
    }

    showActionToast(`You joined ${team.title || "the team"}.`);
  } catch (error) {
    console.error("JOIN TEAM ERROR:", error);

    if (error?.message === "TEAM_FULL") {
      showActionToast("This team is already full.");
    } else if (error?.message === "ALREADY_MEMBER") {
      showActionToast("You are already a member of this team.");
    } else if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "TEAM_BLOCKED") {
      showActionToast(
        "You were removed from this team and cannot join it again."
      );
    } else {
      showActionToast(
        "Unable to join the team. Please try again."
      );
    }
  } finally {
    setTeamActionLoading(false);
  }
};

const openTeamMemberProfile = async (member) => {
  if (!member?.memberId) return;

  try {
    let data;
    let memberId = member.memberId;

    if (memberId === authUser?.uid) {
      data = {
        name: profileData.name || authUser.email || "CIT Student",
        college: profileData.college || "",
        department: profileData.department || "",
        year: profileData.year || "",
        bio: profileData.bio || "",
        skills: profileData.skills || "",
        campusConnectId: profileData.campusConnectId || "",
        email: authUser.email || "",
      };
    } else {
      const memberSnap = await getDoc(doc(db, "users", memberId));
      if (!memberSnap.exists()) {
        showActionToast("Unable to load this member's profile.");
        return;
      }
      data = memberSnap.data();
    }

    setSelectedStudent(null);
    setSelectedTeamPreview(null);
    setTeamStatusOpen(false);
    setSelectedTeam(null);
    setTeamInviteOpen(false);
    setTeamInviteSearch("");
    setProfileNetworkOpen(false);
setViewedProfile({
  id: memberId,
  name:
    data.name ||
    data.email?.split("@")[0] ||
    member.memberName ||
    "CIT Student",

  role:
    normalizeDepartment(
      data.department ||
      data.branch ||
      data.course ||
      data.program ||
      ""
    ) || "Student",

  department: normalizeDepartment(
    data.department ||
    data.branch ||
    data.course ||
    data.program ||
    ""
  ),

  skills: Array.isArray(data.skills)
    ? data.skills
    : (data.skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),

  status: data.status || "Available",

  email: data.email || "",

  year: data.year || "",

  college: data.college || "",

  bio: data.bio || "",

  campusConnectId: data.campusConnectId || "",

  activityData: {
    hackathonsJoined: Number(data.hackathonsJoined) || 0,
    teamsCreated: Number(data.teamsCreated) || 0,
    resourcesShared: Number(data.resourcesShared) || 0,
  },
});
    setProfilePageOpen(true);
    setActiveNav("profile");
    scrollToPageTop();
  } catch (error) {
    console.error("TEAM MEMBER PROFILE ERROR:", error);
    showActionToast("Unable to load this member's profile.");
  }
};

const openTeamPreview = async (team) => {
  if (!team?.id) return;

  setSelectedTeamPreview(team);
  setTeamPreviewOwner(null);
  setTeamPreviewMembers([]);
  setTeamPreviewLoading(true);

  try {
    const latestSnap = await getDoc(doc(db, "teams", team.id));
    const latestTeam = latestSnap.exists()
      ? { id: latestSnap.id, ...latestSnap.data() }
      : team;

    setSelectedTeamPreview(latestTeam);

    const memberIds = Array.from(new Set([
      ...(Array.isArray(latestTeam.memberIds) ? latestTeam.memberIds : []),
      latestTeam.createdBy,
    ].filter(Boolean)));

    const profileSnaps = await Promise.all(
      memberIds.map((id) => getDoc(doc(db, "users", id)))
    );

    const members = profileSnaps
      .map((snap, index) => ({
        id: memberIds[index],
        ...(snap.exists() ? snap.data() : {}),
      }))
      .filter((person) => person.id);

    const owner = members.find((person) => person.id === latestTeam.createdBy) || {
      id: latestTeam.createdBy,
      name: latestTeam.createdByName || "Team Leader",
      department: "",
      year: "",
      campusConnectId: "",
    };

    setTeamPreviewOwner(owner);
    setTeamPreviewMembers(members.filter((person) => person.id !== latestTeam.createdBy));
  } catch (error) {
    console.error("TEAM PREVIEW LOAD ERROR:", error);
    showActionToast("Unable to load team details.");
  } finally {
    setTeamPreviewLoading(false);
  }
};

const closeTeamPreview = () => {
  setSelectedTeamPreview(null);
  setTeamPreviewOwner(null);
  setTeamPreviewMembers([]);
};

const removeTeamMember = (team, member) => {
  if (!authUser || !team?.id || !member?.memberId || team.createdBy !== authUser.uid) return;
  if (member.memberId === authUser.uid) {
    showActionToast("The team owner cannot be removed.");
    return;
  }
  setTeamRemoveTarget({ team, member });
};

const confirmRemoveTeamMember = async () => {
  const target = teamRemoveTarget;

  if (!target?.team || !target?.member) return;

  setTeamRemoveTarget(null);

  const { team, member } = target;
  setTeamActionLoading(true);

  try {
    const teamRef = doc(db, "teams", team.id);
    const latestSnap = await getDoc(teamRef);

    if (!latestSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const latestTeam = {
      id: latestSnap.id,
      ...latestSnap.data(),
    };

    const currentIds = Array.isArray(latestTeam.memberIds)
      ? latestTeam.memberIds
      : [latestTeam.createdBy].filter(Boolean);

    if (!currentIds.includes(member.memberId)) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    const nextIds = currentIds.filter(
      (id) => id !== member.memberId
    );

    const blockedMemberIds = Array.from(
      new Set([
        ...(Array.isArray(latestTeam.blockedMemberIds)
          ? latestTeam.blockedMemberIds
          : []),
        member.memberId,
      ])
    );

    const removeBatch = writeBatch(db);

    removeBatch.update(teamRef, {
      memberIds: nextIds,
      blockedMemberIds,
      status:
        nextIds.length >= (Number(latestTeam.members) || 1)
          ? "Full"
          : "Open",
    });

    removeBatch.delete(
      doc(
        db,
        "teamMemberships",
        `${team.id}_${member.memberId}`
      )
    );

    await removeBatch.commit();

    // Notify the removed member. Notification failure must not make
    // a successful removal appear to have failed.
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: member.memberId,
        actorId: authUser.uid,
        actorName:
          profileData.name || authUser.email || "Team Owner",
        type: "team_member_removed",
        title: "Removed from team",
        message: `You were removed from ${
          latestTeam.title || "the team"
        }.`,
        relatedId: team.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (notificationError) {
      console.error(
        "TEAM MEMBER REMOVAL NOTIFICATION ERROR:",
        notificationError
      );
    }

    const updatedTeam = {
      ...latestTeam,
      memberIds: nextIds,
      blockedMemberIds,
    };

    setSelectedTeam(updatedTeam);

    setAllTeams((prev) =>
      prev.map((item) =>
        item.id === team.id ? updatedTeam : item
      )
    );

    setUserTeams((prev) =>
      prev.map((item) =>
        item.id === team.id ? updatedTeam : item
      )
    );

    setSelectedTeamMembers((prev) =>
      prev.filter(
        (item) => item.memberId !== member.memberId
      )
    );

    setTeamMemberships((prev) =>
      prev.filter(
        (item) =>
          item.id !== `${team.id}_${member.memberId}`
      )
    );

    showActionToast(
      `${member.memberName || "Member"} was removed from the team.`
    );
  } catch (error) {
    console.error("REMOVE TEAM MEMBER ERROR:", error);

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "MEMBER_NOT_FOUND") {
      showActionToast("This member is no longer in the team.");
    } else {
      showActionToast(
        "Unable to remove the team member. Please try again."
      );
    }
  } finally {
    setTeamActionLoading(false);
  }
};

const deleteTeam = (team) => {
  if (!authUser || !team?.id || team.createdBy !== authUser.uid) return;
  setTeamDeleteTarget(team);
};

const confirmDeleteTeam = async () => {
  const team = teamDeleteTarget;

  if (!team) return;

  setTeamDeleteTarget(null);
  setTeamActionLoading(true);

  try {
    const teamSnap = await getDoc(doc(db, "teams", team.id));

    if (!teamSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const teamData = teamSnap.data();

    if (teamData.createdBy !== authUser.uid) {
      throw new Error("NOT_TEAM_OWNER");
    }

    const memberIds = Array.from(
      new Set([
        ...(Array.isArray(teamData.memberIds)
          ? teamData.memberIds
          : []),
        teamData.createdBy,
      ].filter(Boolean))
    );

    const membershipsSnap = await getDocs(
      query(
        collection(db, "teamMemberships"),
        where("teamId", "==", team.id)
      )
    );

    const invitationsSnap = await getDocs(
      query(
        collection(db, "teamInvitations"),
        where("teamId", "==", team.id)
      )
    );

    const documentsToDelete = [
      ...membershipsSnap.docs.map((item) => item.ref),
      ...invitationsSnap.docs.map((item) => item.ref),
      doc(db, "teams", team.id),
    ];

    // Firestore batches have a 500-operation limit.
    for (
      let startIndex = 0;
      startIndex < documentsToDelete.length;
      startIndex += 450
    ) {
      const batch = writeBatch(db);

      documentsToDelete
        .slice(startIndex, startIndex + 450)
        .forEach((ref) => batch.delete(ref));

      await batch.commit();
    }

    // Notify former members after the team itself has been deleted.
    // These notifications are best-effort and do not affect deletion.
    const otherMemberIds = memberIds.filter(
      (id) => id !== authUser.uid
    );

    await Promise.all(
      otherMemberIds.map(async (recipientId) => {
        try {
          await addDoc(collection(db, "notifications"), {
            recipientId,
            actorId: authUser.uid,
            actorName:
              profileData.name ||
              authUser.email ||
              "Team Owner",
            type: "team_deleted",
            title: "Team deleted",
            message: `${
              team.title || "A team"
            } has been deleted by the team owner.`,
            relatedId: team.id,
            read: false,
            createdAt: serverTimestamp(),
          });
        } catch (notificationError) {
          console.error(
            "TEAM DELETE NOTIFICATION ERROR:",
            notificationError
          );
        }
      })
    );

    setAllTeams((prev) =>
      prev.filter((item) => item.id !== team.id)
    );

    setUserTeams((prev) =>
      prev.filter((item) => item.id !== team.id)
    );

    setTeamMemberships((prev) =>
      prev.filter((item) => item.teamId !== team.id)
    );

    setSelectedTeamMembers([]);
    setSelectedTeamPendingInvites([]);
    setSelectedTeam(null);
    setTeamStatusOpen(false);

    showActionToast("Team deleted successfully.");
  } catch (error) {
    console.error("DELETE TEAM ERROR:", error);

    if (error?.code === "permission-denied") {
      showActionToast(
        "Firebase denied team deletion. Make sure the latest Firestore rules are published."
      );
    } else if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "NOT_TEAM_OWNER") {
      showActionToast(
        "Only the team owner can delete this team."
      );
    } else {
      showActionToast(
        "Unable to delete the team. Please try again."
      );
    }
  } finally {
    setTeamActionLoading(false);
  }
};

const openTeamStatus = async (team) => {
  if (!authUser || !team?.id) return;

  const isOwner = team.createdBy === authUser.uid;
  const isMember =
    isOwner ||
    userTeams.some((item) => item.id === team.id) ||
    teamMemberships.some(
      (membership) =>
        membership.teamId === team.id &&
        membership.memberId === authUser.uid
    );

  if (!isMember) {
    showActionToast("You must be a member of this team to view its status.");
    return;
  }

  setTeamStatusReadOnly(!isOwner);
  setSelectedTeam(team);
  setSelectedTeamMembers([]);
  setSelectedTeamPendingInvites([]);
  setTeamStatusOpen(true);
  setTeamStatusLoading(true);

  try {
    // Always read the latest team document first.
    const teamRef = doc(db, "teams", team.id);
    const teamSnap = await withTimeout(
      getDoc(teamRef),
      10000,
      "Team status load"
    );

    if (!teamSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const latestTeam = {
      id: teamSnap.id,
      ...teamSnap.data(),
    };

    setSelectedTeam(latestTeam);

    /*
     * IMPORTANT:
     * teamMemberships is the source of truth for actual membership.
     *
     * memberIds can contain stale IDs from an older version of the app.
     * If we use memberIds alone, a student can incorrectly appear as
     * "Joined" even though their teamMemberships document is gone.
     *
     * The owner is always included separately because owners do not need
     * a teamMemberships document.
     */
    const membershipsSnap = await withTimeout(
      getDocs(
        query(
          collection(db, "teamMemberships"),
          where("teamId", "==", latestTeam.id)
        )
      ),
      10000,
      "Team membership load"
    );

    const membershipRows = membershipsSnap.docs.map((membershipDoc) => ({
      id: membershipDoc.id,
      ...membershipDoc.data(),
    }));

    const actualMemberIds = Array.from(
      new Set([
        latestTeam.createdBy,
        ...membershipRows
          .map((membership) => membership.memberId)
          .filter(Boolean),
      ].filter(Boolean))
    );

    const rows = await Promise.all(
      actualMemberIds.map(async (memberId) => {
        const membership = membershipRows.find(
          (item) => item.memberId === memberId
        );

        try {
          const memberSnap = await withTimeout(
            getDoc(doc(db, "users", memberId)),
            10000,
            "Member profile load"
          );

          const data = memberSnap.exists() ? memberSnap.data() : {};
          const fallback = teammates.find(
            (person) => person.id === memberId
          );

          return {
            id: memberId === latestTeam.createdBy
              ? `owner_${latestTeam.id}`
              : `member_${memberId}`,
            memberId,
            memberName:
              data.name ||
              data.email?.split("@")[0] ||
              membership?.memberName ||
              fallback?.name ||
              (memberId === latestTeam.createdBy ? "Team Owner" : "CIT Student"),
            role:
              memberId === latestTeam.createdBy
                ? "owner"
                : membership?.role || "member",
          };
        } catch (memberError) {
          console.error("TEAM MEMBER LOAD ERROR:", memberError);

          const fallback = teammates.find(
            (person) => person.id === memberId
          );

          return {
            id: memberId === latestTeam.createdBy
              ? `owner_${latestTeam.id}`
              : `member_${memberId}`,
            memberId,
            memberName:
              membership?.memberName ||
              fallback?.name ||
              (memberId === latestTeam.createdBy ? "Team Owner" : "CIT Student"),
            role:
              memberId === latestTeam.createdBy
                ? "owner"
                : membership?.role || "member",
          };
        }
      })
    );

    setSelectedTeamMembers(rows);

    // Only the team owner needs the pending-invitation list here.
    // A normal member can still see Team Status and joined members, but
    // does not need to read other students' invitation documents.
    // Skipping that owner-only read prevents a harmless Firestore
    // permission warning in the member/read-only Team Status view.
    if (isOwner) {
      try {
        const invitationsSnap = await withTimeout(
          getDocs(
            query(
              collection(db, "teamInvitations"),
              where("teamId", "==", latestTeam.id)
            )
          ),
          10000,
          "Team invitation status load"
        );

        const pendingInvites = invitationsSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter(
            (invitation) => invitation.status === "pending"
          );

        setSelectedTeamPendingInvites(pendingInvites);
      } catch (inviteError) {
        console.error(
          "TEAM INVITATION STATUS ERROR:",
          inviteError
        );

        setSelectedTeamPendingInvites([]);
      }
    } else {
      // Members do not need to inspect pending invitations.
      setSelectedTeamPendingInvites([]);
    }
  } catch (error) {
    console.error("TEAM STATUS LOAD ERROR:", error);

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else {
      showActionToast("Unable to load team status.");
    }
  } finally {
    setTeamStatusLoading(false);
  }
};

const dismissWelcome = async () => {
  if (!authUser || welcomeSaving) return;

  setWelcomeSaving(true);
  setWelcomeOpen(false);

  try {
    await setDoc(
      doc(db, "users", authUser.uid),
      { welcomeSeen: true },
      { merge: true }
    );
  } catch (error) {
    console.error("WELCOME SEEN SAVE ERROR:", error);
    setWelcomeOpen(true);
    showActionToast("Unable to save the welcome message status.");
  } finally {
    setWelcomeSaving(false);
  }
};


const leaveTeam = async (team) => {
  if (!authUser || !team?.id) return;

  if (team.createdBy === authUser.uid) {
    showActionToast(
      "Team owners cannot leave their own team."
    );
    return;
  }

  setTeamActionLoading(true);

  const membershipId = `${team.id}_${authUser.uid}`;

  try {
    let latestTeamData = null;

    await runTransaction(db, async (transaction) => {
      const teamRef = doc(db, "teams", team.id);
      const membershipRef = doc(
        db,
        "teamMemberships",
        membershipId
      );

      const teamSnap = await transaction.get(teamRef);

      if (!teamSnap.exists()) {
        throw new Error("TEAM_NOT_FOUND");
      }

      const currentTeam = teamSnap.data();

      const currentMemberIds = Array.isArray(
        currentTeam.memberIds
      )
        ? currentTeam.memberIds
        : [currentTeam.createdBy].filter(Boolean);

      if (!currentMemberIds.includes(authUser.uid)) {
        throw new Error("NOT_MEMBER");
      }

      const nextMemberIds = currentMemberIds.filter(
        (id) => id !== authUser.uid
      );

      transaction.update(teamRef, {
        memberIds: nextMemberIds,
        status: "Open",
      });

      transaction.delete(membershipRef);

      latestTeamData = {
        ...currentTeam,
        memberIds: nextMemberIds,
        status: "Open",
      };
    });

    setTeamMemberships((prev) =>
      prev.filter((item) => item.id !== membershipId)
    );

    setUserTeams((prev) =>
      prev.filter((item) => item.id !== team.id)
    );

    setAllTeams((prev) =>
      prev.map((item) =>
        item.id === team.id
          ? {
              ...item,
              ...(latestTeamData || {}),
              memberIds: (
                latestTeamData?.memberIds ||
                item.memberIds ||
                []
              ).filter((id) => id !== authUser.uid),
              status: "Open",
            }
          : item
      )
    );

    // Notify the team owner. Notification failure must not make
    // a successful leave appear to have failed.
    try {
      await addDoc(collection(db, "notifications"), {
        recipientId: team.createdBy,
        actorId: authUser.uid,
        actorName:
          profileData.name || authUser.email || "CIT Student",
        type: "team_member_left",
        title: "Team member left",
        message: `${
          profileData.name || "A student"
        } left ${
          team.title || "your team"
        }.`,
        relatedId: team.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (notificationError) {
      console.error(
        "TEAM LEAVE NOTIFICATION ERROR:",
        notificationError
      );
    }

    showActionToast(
      `You left ${team.title || "the team"}.`
    );
  } catch (error) {
    console.error("LEAVE TEAM ERROR:", error);

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "NOT_MEMBER") {
      showActionToast(
        "You are no longer a member of this team."
      );
    } else {
      showActionToast(
        "Unable to leave the team. Please try again."
      );
    }
  } finally {
    setTeamActionLoading(false);
  }
};


const openTeamChat = async (team) => {
  if (!authUser || !team?.id) return;

  setTeamChatLoading(true);
  setTeamChatError("");
  setTeamChatMessages([]);

  try {
    const teamRef = doc(db, "teams", team.id);
    const teamSnap = await withTimeout(
      getDoc(teamRef),
      10000,
      "Team chat team check"
    );

    if (!teamSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const latestTeam = {
      id: teamSnap.id,
      ...teamSnap.data(),
    };

    const isOwner = latestTeam.createdBy === authUser.uid;

    if (!isOwner) {
      const membershipSnap = await withTimeout(
        getDoc(
          doc(
            db,
            "teamMemberships",
            `${latestTeam.id}_${authUser.uid}`
          )
        ),
        10000,
        "Team chat membership check"
      );

      if (!membershipSnap.exists()) {
        throw new Error("NOT_TEAM_MEMBER");
      }
    }

    setTeamChatTeam(latestTeam);
    setTeamChatOpen(true);
    setTeamChatMessageMenu(null);
  } catch (error) {
    console.error("TEAM CHAT OPEN ERROR:", error);

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "NOT_TEAM_MEMBER") {
      showActionToast("You are no longer a member of this team.");
    } else {
      showActionToast("Unable to open team chat. Please try again.");
    }
  } finally {
    setTeamChatLoading(false);
  }
};

const closeTeamChat = () => {
  setTeamChatOpen(false);
  setTeamChatTeam(null);
  setTeamChatMessages([]);
  setTeamChatInput("");
  setTeamChatError("");
  setTeamChatMessageMenu(null);
};

useEffect(() => {
  if (!teamChatOpen || !teamChatTeam?.id || !authUser) return undefined;

  setTeamChatLoading(true);
  setTeamChatError("");

  const messagesRef = collection(
    db,
    "teamChats",
    teamChatTeam.id,
    "messages"
  );

  const unsubscribe = onSnapshot(
    messagesRef,
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });

      setTeamChatMessages(messages);
      setTeamChatLoading(false);
    },
    (error) => {
      console.error("TEAM CHAT LISTENER ERROR:", error);
      setTeamChatError(
        "Unable to load team messages. Make sure the latest Firestore rules are published."
      );
      setTeamChatLoading(false);
    }
  );

  return () => unsubscribe();
}, [teamChatOpen, teamChatTeam?.id, authUser]);

// Keep incoming and outgoing message requests live across refreshes and other users' actions.
useEffect(() => {
  if (!authUser?.uid) {
    setSentDirectMessageRequests([]);
    setReceivedDirectMessageRequests([]);
    return undefined;
  }

  const sentQuery = query(
    collection(db, "directMessageRequests"),
    where("senderId", "==", authUser.uid)
  );
  const receivedQuery = query(
    collection(db, "directMessageRequests"),
    where("recipientId", "==", authUser.uid)
  );

  const unsubscribeSent = onSnapshot(
    sentQuery,
    (snapshot) => setSentDirectMessageRequests(
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    ),
    (error) => {
      console.error("SENT MESSAGE REQUESTS LISTENER ERROR:", error);
      setSentDirectMessageRequests([]);
    }
  );
  const unsubscribeReceived = onSnapshot(
    receivedQuery,
    (snapshot) => setReceivedDirectMessageRequests(
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    ),
    (error) => {
      console.error("RECEIVED MESSAGE REQUESTS LISTENER ERROR:", error);
      setReceivedDirectMessageRequests([]);
    }
  );

  return () => {
    unsubscribeSent();
    unsubscribeReceived();
  };
}, [authUser?.uid]);

// Live list of the signed-in student's direct conversations.
useEffect(() => {
  if (!authUser) {
    setDirectConversations([]);
    setDirectConversationsLoading(false);
    return undefined;
  }

  setDirectConversationsLoading(true);

  const conversationsQuery = query(
    collection(db, "directConversations"),
    where("memberIds", "array-contains", authUser.uid)
  );

  const unsubscribe = onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((conversationDoc) => ({
          id: conversationDoc.id,
          ...conversationDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || a.lastMessageAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || b.lastMessageAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      const visibleConversations = conversations.filter((conversation) => {
        const clearedAt = getTimestampMillis(clearedDirectConversationAt[conversation.id]);
        const latestMessageAt = getTimestampMillis(conversation.lastMessageAt);
        return !clearedAt || latestMessageAt > clearedAt;
      });
      setDirectConversations(visibleConversations);
      setDirectConversationsLoading(false);
    },
    (error) => {
      console.error("DIRECT CONVERSATIONS LISTENER ERROR:", error);
      setDirectConversations([]);
      setDirectConversationsLoading(false);
    }
  );

  return () => unsubscribe();
}, [authUser, clearedDirectConversationAt]);

// Listen to current profile documents for people displayed in Messages. This
// keeps old conversation titles, blocked-student rows, connected-student rows,
// and pending request sender names in sync when a student updates their profile.
const directParticipantProfileIds = useMemo(() => {
  if (!authUser?.uid) return [];

  const ids = [];
  const addOtherParticipant = (memberIds) => {
    if (!Array.isArray(memberIds)) return;
    memberIds.forEach((id) => {
      if (typeof id === "string" && id && id !== authUser.uid) ids.push(id);
    });
  };

  directConversations.forEach((conversation) => addOtherParticipant(conversation.memberIds));
  addOtherParticipant(directConversation?.memberIds);
  connections.forEach((connection) => addOtherParticipant(connection.userIds));
  blockedUserIds.forEach((id) => {
    if (typeof id === "string" && id && id !== authUser.uid) ids.push(id);
  });
  directMessageRequests.forEach((request) => {
    if (request.status !== "pending") return;
    if (request.senderId && request.senderId !== authUser.uid) ids.push(request.senderId);
    if (request.recipientId && request.recipientId !== authUser.uid) ids.push(request.recipientId);
  });

  return [...new Set(ids)].sort();
}, [
  authUser?.uid,
  directConversations,
  directConversation,
  connections,
  blockedUserIds,
  directMessageRequests,
]);

const directParticipantProfileIdsKey = JSON.stringify(directParticipantProfileIds);

useEffect(() => {
  const participantIds = JSON.parse(directParticipantProfileIdsKey || "[]");

  if (!authUser?.uid || participantIds.length === 0) {
    setDirectParticipantProfiles({});
    return undefined;
  }

  // Keep only profiles still relevant to the current account's messaging UI.
  setDirectParticipantProfiles((previous) => {
    const next = {};
    participantIds.forEach((id) => {
      if (previous[id]) next[id] = previous[id];
    });
    return next;
  });

  const unsubscribers = participantIds.map((participantId) => onSnapshot(
    doc(db, "users", participantId),
    (profileSnapshot) => {
      if (!profileSnapshot.exists()) {
        setDirectParticipantProfiles((previous) => {
          if (!previous[participantId]) return previous;
          const next = { ...previous };
          delete next[participantId];
          return next;
        });
        return;
      }

      const profileDataFromFirestore = profileSnapshot.data() || {};
      const currentName = profileDataFromFirestore.name?.toString().trim() ||
        profileDataFromFirestore.email?.split("@")[0] || "CIT Student";
      const currentCampusConnectId = profileDataFromFirestore.campusConnectId || "";

      setDirectParticipantProfiles((previous) => {
        const existing = previous[participantId];
        if (
          existing?.name === currentName &&
          existing?.campusConnectId === currentCampusConnectId
        ) {
          return previous;
        }
        return {
          ...previous,
          [participantId]: {
            id: participantId,
            name: currentName,
            campusConnectId: currentCampusConnectId,
          },
        };
      });
    },
    (error) => {
      console.error("DIRECT PARTICIPANT PROFILE LISTENER ERROR:", participantId, error);
    }
  ));

  return () => unsubscribers.forEach((unsubscribeProfile) => unsubscribeProfile());
}, [authUser?.uid, directParticipantProfileIdsKey]);

// Live messages for the selected direct conversation.
useEffect(() => {
  if (!authUser || !directConversation?.id) {
    setDirectMessages([]);
    setDirectMessagesLoading(false);
    return undefined;
  }

  setDirectMessagesLoading(true);

  const messagesRef = collection(
    db,
    "directConversations",
    directConversation.id,
    "messages"
  );

  const unsubscribe = onSnapshot(
    messagesRef,
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });

      const clearedAt = getTimestampMillis(clearedDirectConversationAt[directConversation.id]);
      const visibleMessages = !clearedAt
        ? messages
        : messages.filter((message) => getTimestampMillis(message.createdAt) > clearedAt);
      setDirectMessages(visibleMessages);
      setDirectMessagesLoading(false);
    },
    (error) => {
      console.error("DIRECT MESSAGES LISTENER ERROR:", error);
      setDirectMessages([]);
      setDirectMessagesLoading(false);
      showActionToast("Unable to load this conversation.");
    }
  );

  return () => unsubscribe();
}, [authUser, directConversation?.id, clearedDirectConversationAt]);

useEffect(() => {
  if (!directConversation?.id || !authUser?.uid || directMessages.length === 0) return;

  const latestMessage = directMessages[directMessages.length - 1];
  if (!latestMessage || latestMessage.senderId === authUser.uid) return;

  updateDoc(
    doc(db, "directConversations", directConversation.id),
    {
      [`unreadCounts.${authUser.uid}`]: 0,
      [`lastReadAt.${authUser.uid}`]: serverTimestamp(),
    }
  ).catch((error) => {
    console.error("DIRECT MESSAGE AUTO-READ ERROR:", error);
  });
}, [directMessages, directConversation?.id, authUser?.uid]);

useEffect(() => {
  if (!directConversation) return;
  directMessagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}, [directMessages, directConversation]);

useEffect(() => {
  if (!teamChatOpen) return;
  teamChatMessagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}, [teamChatMessages, teamChatOpen]);

const sendTeamChatMessage = async () => {
  if (!authUser || !teamChatTeam?.id || teamChatSending) return;

  const message = teamChatInput.trim();

  if (!message) return;

  if (message.length > 2000) {
    showActionToast("Messages can be up to 2000 characters.");
    return;
  }

  setTeamChatSending(true);

  try {
    await addDoc(
      collection(
        db,
        "teamChats",
        teamChatTeam.id,
        "messages"
      ),
      {
        teamId: teamChatTeam.id,
        senderId: authUser.uid,
        senderName:
          profileData.name ||
          authUser.email ||
          "CIT Student",
        message,
        createdAt: serverTimestamp(),
      }
    );

    setTeamChatInput("");
  } catch (error) {
    console.error("TEAM CHAT SEND ERROR:", error);

    if (error?.code === "permission-denied") {
      showActionToast(
        "You no longer have permission to send messages in this team."
      );
    } else {
      showActionToast("Unable to send your message. Please try again.");
    }
  } finally {
    setTeamChatSending(false);
  }
};

const submitTeamChatReport = async () => {
  const target = teamChatReportTarget;

  if (
    !authUser ||
    !teamChatTeam?.id ||
    !target?.id ||
    !target.senderId ||
    target.senderId === authUser.uid ||
    !teamChatReportReason ||
    teamChatReportSubmitting
  ) {
    return;
  }

  setTeamChatReportSubmitting(true);

  try {
    await addDoc(collection(db, "teamChatReports"), {
      teamId: teamChatTeam.id,
      messageId: target.id,
      reportedUserId: target.senderId,
      reporterId: authUser.uid,
      reason: teamChatReportReason,
      description: teamChatReportDescription.trim().slice(0, 1000),
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Notify the team owner. Notification failure must not make a
    // successfully-created report appear to have failed.
    if (teamChatTeam.createdBy && teamChatTeam.createdBy !== authUser.uid) {
      try {
        await addDoc(collection(db, "notifications"), {
          recipientId: teamChatTeam.createdBy,
          actorId: authUser.uid,
          actorName:
            profileData.name || authUser.email || "CIT Student",
          type: "team_chat_report",
          title: "Team chat report submitted",
          message: `A message in ${teamChatTeam.title || "your team"} was reported for ${teamChatReportReason.replace(/_/g, " ")}.`,
          relatedId: teamChatTeam.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.error(
          "TEAM CHAT REPORT NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    setTeamChatReportTarget(null);
    setTeamChatReportReason("");
    setTeamChatReportDescription("");
    setTeamChatMessageMenu(null);
    showActionToast("Report submitted. Thank you for helping keep the team chat safe.");
  } catch (error) {
    console.error("TEAM CHAT REPORT ERROR:", error);

    if (error?.code === "permission-denied") {
      showActionToast(
        "Firebase denied the report. Make sure the latest Firestore rules are published."
      );
    } else {
      showActionToast("Unable to submit the report. Please try again.");
    }
  } finally {
    setTeamChatReportSubmitting(false);
  }
};

const formatTeamChatTime = (timestamp) => {
  if (!timestamp) return "Sending...";

  let date = null;

  if (typeof timestamp?.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  }

  if (!date || Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const inviteStudentToTeam = async (student, team) => {
  if (!authUser || !student?.id || !team?.id) return;

  // Student must be connected before they can be invited.
  if (!getConnectionForStudent(student.id)) {
    showActionToast(
      "Connect with the student before inviting them to a team."
    );
    return;
  }

  const invitationId = `${team.id}_${student.id}`;
  const invitationRef = doc(
    db,
    "teamInvitations",
    invitationId
  );

  const teamRef = doc(
    db,
    "teams",
    team.id
  );

  // Check local membership first.
  const actualMember = selectedTeamMembers.some(
    (member) => member.memberId === student.id
  );

  if (actualMember) {
    showActionToast(
      "This student is already a member of the team."
    );
    return;
  }

  setTeamInviteLoading(true);

  try {
    /*
     * ============================================================
     * STEP 1 — VERIFY THE TEAM
     * ============================================================
     */

    let teamSnap;

    try {
      teamSnap = await withTimeout(
        getDoc(teamRef),
        10000,
        "Team invitation team check"
      );
    } catch (error) {
      console.error(
        "TEAM INVITE STEP 1 — TEAM READ FAILED:",
        error
      );
      throw error;
    }

    if (!teamSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const latestTeam = teamSnap.data();

    // Only the team owner can send invitations.
    if (latestTeam.createdBy !== authUser.uid) {
      throw new Error("NOT_TEAM_OWNER");
    }

    /*
     * ============================================================
     * STEP 2 — REMOVE STUDENT FROM BLOCKED LIST
     * ============================================================
     */

    const blockedMemberIds = Array.isArray(
      latestTeam.blockedMemberIds
    )
      ? latestTeam.blockedMemberIds
      : [];

    const nextBlockedMemberIds =
      blockedMemberIds.filter(
        (id) => id !== student.id
      );

    /*
     * ============================================================
     * STEP 3 — CREATE INVITATION DATA
     * ============================================================
     */

    const invitationData = {
      teamId: team.id,

      teamTitle:
        latestTeam.title ||
        team.title ||
        "Hackathon Team",

      inviterId: authUser.uid,

      inviterName:
        profileData.name ||
        authUser.email ||
        "CIT Student",

      inviteeId: student.id,

      inviteeName:
        student.name ||
        "CIT Student",

      status: "pending",

      createdAt: serverTimestamp(),
    };

    /*
     * ============================================================
     * STEP 4 — WRITE INVITATION + UPDATE BLOCKED LIST
     *
     * This works for:
     *
     * 1. No previous invitation  -> CREATE
     * 2. Declined invitation     -> UPDATE to pending
     * 3. Accepted invitation     -> UPDATE to pending
     *
     * The Firestore rules now allow declined/accepted -> pending.
     * ============================================================
     */

    try {
      const invitationBatch = writeBatch(db);

      invitationBatch.set(
        invitationRef,
        invitationData
      );

      invitationBatch.update(
        teamRef,
        {
          blockedMemberIds:
            nextBlockedMemberIds,
        }
      );

      await withTimeout(
        invitationBatch.commit(),
        10000,
        "Team invitation creation/update"
      );
    } catch (error) {
      console.error(
        "TEAM INVITE STEP 4 — WRITE FAILED:",
        error
      );
      throw error;
    }

    /*
     * ============================================================
     * STEP 5 — UPDATE LOCAL TEAM STATE
     * ============================================================
     */

    const updatedTeam = {
      ...team,
      ...latestTeam,
      id: team.id,
      blockedMemberIds:
        nextBlockedMemberIds,
    };

    setSelectedTeam(updatedTeam);

    setAllTeams((prev) =>
      prev.map((item) =>
        item.id === team.id
          ? updatedTeam
          : item
      )
    );

    setUserTeams((prev) =>
      prev.map((item) =>
        item.id === team.id
          ? updatedTeam
          : item
      )
    );

    /*
     * ============================================================
     * STEP 6 — UPDATE LOCAL PENDING INVITATION LIST
     * ============================================================
     */

    const newLocalInvitation = {
      id: invitationId,
      ...invitationData,
    };

    setSelectedTeamPendingInvites((prev) => {
      const filtered = prev.filter(
        (invite) =>
          invite.id !== invitationId
      );

      return [
        ...filtered,
        newLocalInvitation,
      ];
    });

    /*
     * ============================================================
     * STEP 7 — SEND NOTIFICATION
     *
     * Notification is secondary.
     * If it fails, the actual invitation remains successful.
     * ============================================================
     */

    try {
      await withTimeout(
        addDoc(
          collection(db, "notifications"),
          {
            recipientId: student.id,

            actorId: authUser.uid,

            actorName:
              profileData.name ||
              authUser.email ||
              "CIT Student",

            type: "team_invitation",

            title: "Team invitation",

            message: `You were invited to join ${
              latestTeam.title ||
              team.title ||
              "a team"
            }.`,

            relatedId: invitationId,

            read: false,

            createdAt: serverTimestamp(),
          }
        ),
        10000,
        "Team invitation notification"
      );
    } catch (notificationError) {
      console.error(
        "TEAM INVITATION NOTIFICATION ERROR:",
        notificationError
      );
    }

    /*
     * ============================================================
     * SUCCESS
     * ============================================================
     */

    showActionToast(
      `${student.name || "Student"} was invited to the team.`
    );

  } catch (error) {
    console.error(
      "================================================"
    );

    console.error(
      "TEAM INVITATION ERROR:"
    );

    console.error(error);

    console.error(
      "TEAM INVITATION ERROR CODE:",
      error?.code
    );

    console.error(
      "TEAM INVITATION ERROR MESSAGE:",
      error?.message
    );

    console.error(
      "================================================"
    );

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast(
        "This team could not be found."
      );
    } else if (
      error?.message === "NOT_TEAM_OWNER"
    ) {
      showActionToast(
        "Only the team owner can send invitations."
      );
    } else {
      showActionToast(
        "Unable to send the team invitation. Please try again."
      );
    }

  } finally {
    setTeamInviteLoading(false);
  }
};

const openTeamInviteStudents = async (team) => {
  if (!authUser || team?.createdBy !== authUser.uid) return;

  // Open the modal immediately so Firebase loading can never freeze
  // the Team Invite UI.
  setSelectedTeam(team);
  setSelectedTeamMembers([]);
  setSelectedTeamPendingInvites([]);
  setTeamInviteSearch("");
  setTeamInviteOpen(true);

  try {
    /*
     * Load ACTUAL team memberships.
     * This intentionally does not use team.memberIds because stale IDs
     * must not make a student appear as "Joined".
     */
    const membershipsSnapshot = await withTimeout(
      getDocs(
        query(
          collection(db, "teamMemberships"),
          where("teamId", "==", team.id)
        )
      ),
      10000,
      "Team membership load"
    );

    const membershipRows = membershipsSnapshot.docs.map(
      (d) => ({
        id: d.id,
        ...d.data(),
      })
    );

    const actualMemberIds = new Set(
      [
        team.createdBy,
        ...membershipRows
          .map((membership) => membership.memberId)
          .filter(Boolean),
      ].filter(Boolean)
    );

    const memberRows = await Promise.all(
      Array.from(actualMemberIds).map(async (memberId) => {
        if (memberId === team.createdBy) {
          return {
            id: `owner_${team.id}`,
            memberId,
            memberName:
              profileData.name ||
              team.createdByName ||
              authUser.email ||
              "Team Owner",
            role: "owner",
          };
        }

        const membership = membershipRows.find(
          (item) => item.memberId === memberId
        );

        try {
          const memberSnap = await withTimeout(
            getDoc(doc(db, "users", memberId)),
            10000,
            "Member profile load"
          );

          const data = memberSnap.exists()
            ? memberSnap.data()
            : {};

          const fallback = teammates.find(
            (person) => person.id === memberId
          );

          return {
            id: `member_${memberId}`,
            memberId,
            memberName:
              data.name ||
              data.email?.split("@")[0] ||
              membership?.memberName ||
              fallback?.name ||
              "CIT Student",
            role: membership?.role || "member",
          };
        } catch (memberError) {
          console.error(
            "TEAM INVITE MEMBER LOAD ERROR:",
            memberError
          );

          const fallback = teammates.find(
            (person) => person.id === memberId
          );

          return {
            id: `member_${memberId}`,
            memberId,
            memberName:
              membership?.memberName ||
              fallback?.name ||
              "CIT Student",
            role: membership?.role || "member",
          };
        }
      })
    );

    setSelectedTeamMembers(memberRows);

    // Only pending invitations are considered pending.
    // An accepted invitation without an actual membership document
    // must NOT make the student appear as Joined.
    const sentInvitationsSnapshot = await withTimeout(
      getDocs(
        query(
          collection(db, "teamInvitations"),
          where("inviterId", "==", authUser.uid)
        )
      ),
      10000,
      "Team invitation status load"
    );

    const pendingInvites = sentInvitationsSnapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter(
        (invite) =>
          invite.teamId === team.id &&
          invite.status === "pending"
      );

    setSelectedTeamPendingInvites(pendingInvites);
  } catch (error) {
    console.error(
      "TEAM INVITE STATUS LOAD ERROR:",
      error
    );

    // The modal stays usable even if the background Firebase read fails.
    setSelectedTeamMembers([]);
    setSelectedTeamPendingInvites([]);
    showActionToast(
      "Unable to refresh team membership status."
    );
  }
};

const closeTeamInviteStudents = () => {
  setTeamInviteOpen(false);
  setTeamInviteSearch("");
  setTeamInviteLoading(false);
};

const respondToTeamInvitation = async (invitation, decision) => {
  if (!authUser || invitation.inviteeId !== authUser.uid) return;

  setTeamInviteLoading(true);

  try {
    if (decision === "accepted") {
      const teamRef = doc(db, "teams", invitation.teamId);
      const membershipRef = doc(
        db,
        "teamMemberships",
        `${invitation.teamId}_${authUser.uid}`
      );

      const existingMembershipSnap = await withTimeout(
        getDoc(membershipRef),
        10000,
        "Existing team membership check"
      );

      if (existingMembershipSnap.exists()) {
        throw new Error("ALREADY_MEMBER");
      }

      await runTransaction(db, async (transaction) => {
        const teamSnap = await transaction.get(teamRef);

        if (!teamSnap.exists()) {
          throw new Error("TEAM_NOT_FOUND");
        }

        const teamData = teamSnap.data();

        // Remove only this user's stale ID, if an old team document
        // still contains it. Actual membership is represented by
        // teamMemberships/{teamId_userId}.
        const currentMemberIds = Array.isArray(teamData.memberIds)
          ? teamData.memberIds.filter(
              (id) => id !== authUser.uid
            )
          : [teamData.createdBy].filter(
              (id) => id !== authUser.uid
            );

        const maxMembers = Number(teamData.members) || 1;

        if (currentMemberIds.length >= maxMembers) {
          throw new Error("TEAM_FULL");
        }

        const nextMemberIds = Array.from(
          new Set([
            ...currentMemberIds,
            authUser.uid,
          ].filter(Boolean))
        );

        const nextCount = nextMemberIds.length;

        transaction.update(teamRef, {
          memberIds: nextMemberIds,
          status: nextCount >= maxMembers ? "Full" : "Open",
        });

        transaction.set(membershipRef, {
          teamId: invitation.teamId,
          teamTitle: invitation.teamTitle || "Hackathon Team",
          memberId: authUser.uid,
          memberName:
            profileData.name || authUser.email || "CIT Student",
          role: "member",
          joinedAt: serverTimestamp(),
        });
      });

      // Only mark the invitation as accepted AFTER
      // the team membership transaction succeeds.
      await updateDoc(doc(db, "teamInvitations", invitation.id), {
        status: "accepted",
        respondedAt: serverTimestamp(),
      });

      const joinedTeam = allTeams.find(
        (team) => team.id === invitation.teamId
      );

      if (joinedTeam) {
        setUserTeams((prev) => [
          ...prev.filter((team) => team.id !== joinedTeam.id),
          {
            ...joinedTeam,
            memberIds: Array.from(
              new Set([
                ...(joinedTeam.memberIds ||
                  [joinedTeam.createdBy].filter(Boolean)),
                authUser.uid,
              ])
            ),
          },
        ]);
      }

      try {
        await addDoc(collection(db, "notifications"), {
          recipientId: invitation.inviterId,
          actorId: authUser.uid,
          actorName:
            profileData.name || authUser.email || "CIT Student",
          type: "team_invitation_accepted",
          title: "Team invitation accepted",
          message: `${profileData.name || "A student"} joined ${
            invitation.teamTitle || "your team"
          }.`,
          relatedId: invitation.teamId,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.error(
          "TEAM INVITATION ACCEPTED NOTIFICATION ERROR:",
          notificationError
        );
      }

      setTeamInvitations((prev) =>
        prev.map((item) =>
          item.id === invitation.id
            ? { ...item, status: "accepted" }
            : item
        )
      );

      showActionToast(
        `You joined ${invitation.teamTitle || "the team"}.`
      );
    } else {
      // Decline the invitation.
      await updateDoc(doc(db, "teamInvitations", invitation.id), {
        status: "declined",
        respondedAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, "notifications"), {
          recipientId: invitation.inviterId,
          actorId: authUser.uid,
          actorName:
            profileData.name || authUser.email || "CIT Student",
          type: "team_invitation_declined",
          title: "Team invitation declined",
          message: `${profileData.name || "A student"} declined your team invitation.`,
          relatedId: invitation.teamId,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.error(
          "TEAM INVITATION DECLINED NOTIFICATION ERROR:",
          notificationError
        );
      }

      setTeamInvitations((prev) =>
        prev.map((item) =>
          item.id === invitation.id
            ? { ...item, status: "declined" }
            : item
        )
      );

      showActionToast("Team invitation declined.");
    }
  } catch (error) {
    console.error("TEAM INVITATION RESPONSE ERROR:", error);

    if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else if (error?.message === "TEAM_FULL") {
      showActionToast("This team is already full.");
    } else if (error?.message === "ALREADY_MEMBER") {
      showActionToast("You are already a member of this team.");
    } else {
      showActionToast("Unable to update the team invitation.");
    }
  } finally {
    setTeamInviteLoading(false);
  }
};

const getOpportunityUrl = (item) => getOpportunityOfficialUrl(item);


const getOpportunityCategory = (item) =>
  (item?.category || item?.type || item?.domain || "").toString().trim();

const getOpportunityYear = (item) =>
  (item?.year || item?.eligibleYear || item?.eligibleYears || item?.targetYear || "").toString().trim();

const getOpportunityEligibility = (item) =>
  (item?.eligibility || item?.eligibleFor || item?.audience || "").toString().trim();

const getDataIcon = (iconName, fallback = Code2) => {
  const icons = {
    rocket: Rocket,
    shield: Shield,
    code: Code2,
    code2: Code2,
    palette: Palette,
    database: Database,
    megaphone: Megaphone,
  };

  return icons[(iconName || "").toString().toLowerCase()] || fallback;
};

const normalizedTeammateSearch = searchText.toLowerCase().trim();
const normalizedTeammateSkill = teammateSkillFilter.toLowerCase().trim();

const normalizeCampusConnectId = (value) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const competitionFilterSource = showAllCompetitions && allCompetitions.length ? allCompetitions : hackathons;

const hackathonFilterOptions = useMemo(() => {
  const categories = [...new Set(competitionFilterSource.map(getOpportunityCategory).filter(Boolean))].sort();
  const years = [...new Set(competitionFilterSource.map(getOpportunityYear).filter(Boolean))].sort();
  return { categories, years };
}, [competitionFilterSource]);

const filterCompetitionList = (items) => {
  const normalizedSearch = opportunitySearch.trim().toLowerCase();
  const filtered = items.filter((competition) => {
    const searchableText = [
      competition.name,
      competition.description,
      competition.detailOverview,
      competition.category,
      competition.organizer,
      competition.eligibleYear,
      competition.prizeAmount,
      competition.sourceStatus,
      competition.statusLabel,
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesCategory = !hackathonCategoryFilter || getOpportunityCategory(competition) === hackathonCategoryFilter;
    const matchesYear = !hackathonYearFilter || getOpportunityYear(competition) === hackathonYearFilter;
    return matchesSearch && matchesCategory && matchesYear;
  });

  return [...filtered].sort((a, b) => {
    if (opportunitySort === "name") return (a.name || "").localeCompare(b.name || "");
    if (opportunitySort === "prize") return (b.prizeAmount || "").localeCompare(a.prizeAmount || "");
    return (a.daysRemaining ?? 999999) - (b.daysRemaining ?? 999999);
  });
};

const filteredOpportunityHackathons = useMemo(
  () => filterCompetitionList(hackathons),
  [hackathons, opportunitySearch, hackathonCategoryFilter, hackathonYearFilter, opportunitySort]
);

const filteredAllCompetitionHackathons = useMemo(
  () => filterCompetitionList(allCompetitions),
  [allCompetitions, opportunitySearch, hackathonCategoryFilter, hackathonYearFilter, opportunitySort]
);

const displayedCompetitionList = showAllCompetitions ? filteredAllCompetitionHackathons : filteredOpportunityHackathons;
const visibleOpportunityHackathons = showAllCompetitions
  ? displayedCompetitionList.slice(0, allCompetitionVisibleCount)
  : showAllOpportunities
  ? displayedCompetitionList
  : displayedCompetitionList.slice(0, 12);

const closingSoonOpportunities = filteredOpportunityHackathons.filter(
  (item) => typeof item.daysRemaining === "number" && item.daysRemaining >= 0 && item.daysRemaining <= 7
);

const activeCompetitionCount = allCompetitions.filter((item) => item.activeForRegistration).length;
const closedCompetitionCount = allCompetitions.filter((item) => !item.activeForRegistration).length;

const loadAllCompetitions = async () => {
  if (allCompetitionsLoading) return [];
  setAllCompetitionsLoading(true);
  try {
    const competitions = await fetchAllCompetitionDashboard();
    const enriched = enrichCompetitionLinks(competitions);
    setAllCompetitions(enriched);
    return enriched;
  } catch (error) {
    console.error("ALL COMPETITIONS LOAD ERROR:", error);
    showActionToast("Could not load the complete competition dashboard right now.");
    return [];
  } finally {
    setAllCompetitionsLoading(false);
  }
};

const toggleAllCompetitionsView = async () => {
  if (showAllCompetitions) {
    setShowAllCompetitions(false);
    setAllCompetitionVisibleCount(10);
    return;
  }

  if (!allCompetitions.length) {
    const loaded = await loadAllCompetitions();
    if (!loaded.length) return;
  }

  setShowAllCompetitions(true);
  setShowAllOpportunities(false);
  setAllCompetitionVisibleCount(10);
};

const filteredTeammates = teammates.filter((person) => {
  const personName = (person.name || "").toLowerCase();
  const personId = normalizeCampusConnectId(person.campusConnectId);
  const searchId = normalizeCampusConnectId(normalizedTeammateSearch);
  const personDepartment = normalizeDepartment(person.department || person.role || "");
  const personYear = (person.year || "").toLowerCase().trim();
  const personSkills = Array.isArray(person.skills)
    ? person.skills.map((skill) => skill.toLowerCase().trim()).filter(Boolean)
    : [];

  const matchesSearch =
    !normalizedTeammateSearch ||
    personName.includes(normalizedTeammateSearch) ||
    (searchId.length > 0 && personId.startsWith(searchId)) ||
    personSkills.some((skill) => skill.includes(normalizedTeammateSearch)) ||
    personDepartment.toLowerCase().includes(normalizedTeammateSearch);

  const matchesDepartment =
    !teammateDepartmentFilter ||
    personDepartment === normalizeDepartment(teammateDepartmentFilter);

  const matchesYear =
    !teammateYearFilter ||
    personYear === teammateYearFilter.toLowerCase().trim();

  const matchesSkill =
    !normalizedTeammateSkill ||
    personSkills.some((skill) => skill.includes(normalizedTeammateSkill));

  return matchesSearch && matchesDepartment && matchesYear && matchesSkill;
});

const teammateSearchActive = Boolean(
  normalizedTeammateSearch || teammateDepartmentFilter || teammateYearFilter || normalizedTeammateSkill
);

const teammateDepartments = DEPARTMENT_OPTIONS;
const teammateYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const normalizedTeamInviteSearch = teamInviteSearch.toLowerCase().trim();
const teamInviteStudents = teammates.filter((student) => {
  const name = (student.name || "").toLowerCase();
  const campusId = normalizeCampusConnectId(student.campusConnectId);
  const department = normalizeDepartment(student.department || student.role || "").toLowerCase();
  const year = (student.year || "").toLowerCase();
  const skills = Array.isArray(student.skills)
    ? student.skills.map((skill) => skill.toLowerCase().trim()).filter(Boolean)
    : [];

  if (!normalizedTeamInviteSearch) return true;

  const normalizedSearchId = normalizeCampusConnectId(normalizedTeamInviteSearch);
  return (
    name.includes(normalizedTeamInviteSearch) ||
    (normalizedSearchId && campusId.startsWith(normalizedSearchId)) ||
    department.includes(normalizedTeamInviteSearch) ||
    year.includes(normalizedTeamInviteSearch) ||
    skills.some((skill) => skill.includes(normalizedTeamInviteSearch))
  );
});

const normalizeTeamConnectId = (value) =>
  (value || "")
    .toString()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^TEAM-?/, "");

const teamSearchValue = normalizeTeamConnectId(teamSearchId);
const teamSearchResults = teamSearchValue
  ? allTeams.filter((team) =>
      normalizeTeamConnectId(team.teamConnectId).startsWith(teamSearchValue)
    )
  : [];

const openTeams = allTeams.filter(
  (team) =>
    team.status !== "Closed" &&
    team.status !== "Full" &&
    team.createdBy !== authUser?.uid &&
    !userTeams.some((mine) => mine.id === team.id)
);

const filteredSearchHackathons = hackathons.filter((hackathon) => {
  const query = searchText.toLowerCase().trim();

  if (!query) return false;

  return (
    (hackathon.name || "").toLowerCase().includes(query) ||
    (hackathon.description || "").toLowerCase().includes(query) ||
    (hackathon.date || "").toLowerCase().includes(query)
  );
});

if (authLoading) {
  return null;
}
if (!authUser) {
  return (
    <div className={`app-shell ${lightMode ? "light-mode" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <style>{COMPETITION_FINAL_POLISH_CSS}</style>
      <div className="auth-page">
        <div className="auth-card">

{/* FLOATING ELEMENTS */}

<div className="auth-orbit auth-orbit-one">
  <div className="auth-float-icon">
    <Users size={20} />
  </div>
  <span>Connect</span>
</div>

<div className="auth-orbit auth-orbit-two">
  <div className="auth-float-icon">
    <Trophy size={20} />
  </div>
  <span>Compete</span>
</div>

<div className="auth-orbit auth-orbit-three">
  <div className="auth-float-icon">
    <Code2 size={20} />
  </div>
  <span>Build</span>
</div>

<div className="auth-orbit auth-orbit-four">
  <div className="auth-float-icon">
    <BookOpen size={20} />
  </div>
  <span>Learn</span>
</div>

<div className="auth-orbs" aria-hidden="true" />

<div className="auth-particles" aria-hidden="true" />

{/* CENTER CONTENT */}

{/* CENTER CONTENT */}

<div className="auth-center-content">

  <div className="auth-logo">
    <Rocket size={30} />
  </div>

  <span className="auth-brand-label">
    CAMPUSCONNECT
  </span>

  <h1>
    Welcome to
    <br />
    <span>CampusConnect</span>
  </h1>

  <p className="auth-description">
    Connect with students, build teams, and
    <br />
    collaborate on amazing ideas.
  </p>

  <div className="auth-actions">

    <button
  type="button"
  className="auth-primary-button"
onClick={() => {
  setSignInOpen(true);
  setSignInError("");
  setSignInMessage("");
  setVerificationNeeded(false);
}}
>
  Sign In
  <span>→</span>
</button>

    <button
  type="button"
  className="auth-secondary-button"
  onClick={() => {
  setSignUpOpen(true);
  setSignUpError("");
  setSignUpMessage("");
}}
>
  Create Account
  <User size={18} />
</button>

  </div>
{signInOpen && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal">
      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => {
  setSignInOpen(false);
  setSignInError("");
  setSignInMessage("");
  setVerificationNeeded(false);
}}
      >
        ×
      </button>

      <div className="hackathon-modal-icon">
        <User size={28} />
      </div>

      <span className="eyebrow">WELCOME BACK</span>

      <h2>Sign In</h2>

      <p className="hackathon-modal-description">
        Sign in to continue to your CampusConnect account.
      </p>

     <form
onSubmit={async (e) => {
  e.preventDefault();

  // Keep a stable reference to the form before any async work.
  // React can make e.currentTarget null after an await.
  const form = e.currentTarget;

  const emailInput = form.querySelector(
    'input[type="email"]'
  );

  const passwordInput = form.querySelector(
    'input[type="password"]'
  );

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  if (!email || !password) {
    setSignInError("Please enter your email and password.");
    return;
  }

  if (!isCollegeEmail(email)) {
    setSignInError(getCollegeEmailError());
    return;
  }

  try {
    setSignInError("");
    setSignInMessage("");
    setVerificationNeeded(false);

    authFlowRef.current = "signin";

    setSignInLoading(true);
    setAuthLoading(true);

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    if (!user.emailVerified) {
      await signOut(auth);

      setAuthUser(null);
      setSignInLoading(false);
      setAuthLoading(false);
      setVerificationNeeded(true);

      setSignInError(
        "Please verify your email before signing in."
      );

      authFlowRef.current = null;
      return;
    }

    setAuthUser(user);
    setSignInLoading(false);
    setAuthLoading(false);

    authFlowRef.current = null;

    form.reset();
  } catch (error) {
    console.error("SIGN IN ERROR:", error);

    authFlowRef.current = null;
    setSignInLoading(false);
    setAuthLoading(false);

    setSignInError("Invalid email or password.");
  }
}}
>
        <input
          type="email"
          name="email"
          placeholder="CIT email (name@citchennai.net)"
          required
        />

       <input
  type="password"
  name="password"
  placeholder="Password"
  required
/>
<button
  type="button"
  className="auth-link-button"
  onClick={() => {
    setSignInError("");
    setSignInMessage("");
    setForgotPasswordError("");
    setForgotPasswordMessage("");
    setForgotPasswordOpen(true);
  }}
>
  Forgot password?
</button>
{signInError && (
  <div className="auth-error-message">
    ⚠ {signInError}
  </div>
)}
{verificationNeeded && (
  <button
    type="button"
    className="auth-link-button"
    onClick={async () => {
      if (resendSubmittingRef.current) return;
resendSubmittingRef.current = true;
      try {
        
        authFlowRef.current = "resend";

        setResendLoading(true);
        setSignInError("");
        setSignInMessage("");

        const emailInput = document.querySelector(
          '.hackathon-modal input[type="email"]'
        );

        const passwordInput = document.querySelector(
          '.hackathon-modal input[type="password"]'
        );

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
          setSignInError(
            "Enter your email and password first."
          );
          return;
        }

        if (!isCollegeEmail(email)) {
          setSignInError(getCollegeEmailError());
          return;
        }

        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );

        await sendEmailVerification(
          userCredential.user
        );

        await signOut(auth);

        setSignInMessage(
          "Verification email sent again. Please check your inbox."
        );
      } catch (error) {
        console.error(
          "RESEND VERIFICATION ERROR:",
          error
        );

        setSignInError(
          "Unable to resend the verification email. Please try again."
        );
      } finally {
  setResendLoading(false);
  resendSubmittingRef.current = false;
  authFlowRef.current = null;
}
    }}
    disabled={resendLoading}
  >
    {resendLoading
      ? "Sending..."
      : "Resend verification email"}
  </button>
)}

{signInMessage && (
  <div className="auth-success-message">
    ✓ {signInMessage}
  </div>
)}
<button
  type="submit"
  className="primary-button"
  disabled={signInLoading}
>
  {signInLoading ? "Signing In..." : "Sign In"}
</button>
      </form>
    </div>
  </div>
)}
{forgotPasswordOpen && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal signup-modal">

      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => {
          setForgotPasswordOpen(false);
          setForgotPasswordError("");
          setForgotPasswordMessage("");
        }}
      >
        ×
      </button>

      <div className="hackathon-modal-icon">
        🔐
      </div>

      <span className="eyebrow">
        ACCOUNT RECOVERY
      </span>

      <h2>Reset Password</h2>

      <p className="hackathon-modal-description">
        Enter your email address and we'll send you a
        password reset link.
      </p>

      <form
     onSubmit={async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
const formData = new FormData(form);

  const email = formData
    .get("email")
    ?.toString()
    .trim();

  setForgotPasswordError("");
  setForgotPasswordMessage("");

  if (!email) {
    setForgotPasswordError(
      "Please enter your email address."
    );
    return;
  }

  if (!isCollegeEmail(email)) {
    setForgotPasswordError(getCollegeEmailError());
    return;
  }

  if (forgotPasswordSubmittingRef.current) {
    return;
  }

  forgotPasswordSubmittingRef.current = true;

  try {
    setForgotPasswordLoading(true);

    await sendPasswordResetEmail(auth, email);

    setForgotPasswordError("");
    setForgotPasswordMessage(
      "Password reset email sent. Please check your inbox."
    );

    form.reset();
  } catch (error) {
    console.error(
      "PASSWORD RESET ERROR:",
      error
    );

    setForgotPasswordMessage("");
    setForgotPasswordError(
      "Unable to send the reset email. Please check your email address and try again."
    );
  } finally {
    setForgotPasswordLoading(false);
    forgotPasswordSubmittingRef.current = false;
  }
}}
      >
        <input
          type="email"
          name="email"
          placeholder="CIT email (name@citchennai.net)"
          required
        />

        {forgotPasswordError && (
          <div className="auth-error-message">
            ⚠ {forgotPasswordError}
          </div>
        )}

        {forgotPasswordMessage && (
          <div className="auth-success-message">
            ✓ {forgotPasswordMessage}
          </div>
        )}

        <button
  type="submit"
  className="primary-button"
  disabled={forgotPasswordLoading}
>
  {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
</button>
      </form>
    </div>
  </div>
)}
{signUpOpen && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal signup-modal">
      
      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => {
  setSignUpOpen(false);
  setSignUpError("");
  setSignUpMessage("");
}}
      >
        ×
      </button>

      <div className="hackathon-modal-icon">
        <User size={28} />
      </div>

      <span className="eyebrow">GET STARTED</span>

      <h2>Create Account</h2>

      <p className="hackathon-modal-description">
        Create your CampusConnect account and start connecting with students. Your name, department, and year are derived from your verified CIT email.
      </p>

      <form
        onSubmit={async (e) => {
e.preventDefault();

const form = e.currentTarget;

const formData = new FormData(form);
const email = formData.get("email");
const password = formData.get("password");

if (!email || !password) {
  setSignUpError("Please fill in all fields.");
  return;
}
const profileEmail = email.toString().trim().toLowerCase();

if (!isCollegeEmail(profileEmail)) {
  setSignUpError(getCollegeEmailError());
  return;
}

const emailIdentity = getCITEmailIdentity(profileEmail);
if (!emailIdentity) {
  setSignUpError("Please use the CIT email format name.departmentYYYY@citchennai.net.");
  return;
}

const profileName = formatLockedName(emailIdentity.nameSequence);
const profileDepartment = normalizeDepartment(emailIdentity.department);
const profileYear = getAcademicYearLabelFromBatch(emailIdentity.batchYear);

if (signUpSubmittingRef.current) return;
signUpSubmittingRef.current = true;

let createdUser = null;
let profileCreated = false;

try {
  authFlowRef.current = "signup";

  setSignUpLoading(true);
  setSignUpError("");
  setSignUpMessage("Creating your account...");
  setAuthLoading(true);

  const userCredential =
    await withTimeout(
      createUserWithEmailAndPassword(
        auth,
        profileEmail,
        password
      ),
      20000,
      "Account creation"
    );

  createdUser = userCredential.user;

  setSignUpMessage("Saving your profile...");

  await withTimeout(
    setDoc(
      doc(db, "users", createdUser.uid),
      {
        name: profileName,
        email: profileEmail,
        college: CAMPUSCONNECT_COLLEGE,
        department: profileDepartment,
        batchYear: emailIdentity.batchYear,
        year: profileYear,
        bio: "",
        skills: "",
        lockedNameSequence: emailIdentity.nameSequence,
        identityProfileVersion: IDENTITY_PROFILE_VERSION,
        identitySetupCompleted: false,
        emailVerified: false,
      }
    ),
    15000,
    "Profile creation"
  );

  profileCreated = true;

  setSignUpMessage("Sending verification email...");

  await withTimeout(
    sendEmailVerification(createdUser),
    20000,
    "Verification email"
  );

  await signOut(auth);

  setAuthUser(null);
  setAuthLoading(false);
  authFlowRef.current = null;

  setSignUpError("");
  setSignUpMessage(
    "Account created! Please check your email and verify your account before signing in."
  );

  form.reset();
} catch (error) {
  console.error("SIGN UP ERROR:", error);

  // If Auth created an account but a later signup step failed, remove the
  // temporary Auth account so the user can retry with the same email.
  if (createdUser) {
    try {
      if (profileCreated) {
        await deleteDoc(
          doc(db, "users", createdUser.uid)
        );
      }
    } catch (cleanupError) {
      console.error(
        "SIGN UP PROFILE CLEANUP ERROR:",
        cleanupError
      );
    }

    try {
      await deleteUser(createdUser);
    } catch (cleanupError) {
      console.error(
        "SIGN UP AUTH CLEANUP ERROR:",
        cleanupError
      );
      try {
        await signOut(auth);
      } catch {}
    }
  }

  authFlowRef.current = null;
  setSignUpLoading(false);
  setAuthLoading(false);
  setSignUpMessage("");

  const errorCode = error?.code || "";

  if (errorCode === "auth/email-already-in-use") {
    setSignUpError(
      "This email is already registered. Please sign in or use another CIT email."
    );
  } else if (errorCode === "auth/invalid-api-key") {
    setSignUpError(
      "Firebase configuration is invalid. Please check the Firebase web app configuration."
    );
  } else if (errorCode === "permission-denied") {
    setSignUpError(
      "Your account was created, but Firebase blocked the profile setup. Please try again."
    );
  } else if (error?.message?.toLowerCase().includes("timed out")) {
    setSignUpError(
      error.message
    );
  } else {
    setSignUpError(
      "Unable to create your account. Please try again."
    );
  }
} finally {
  signUpSubmittingRef.current = false;
  setSignUpLoading(false);
}
        }}
      >
        <input
          type="email"
          name="email"
          placeholder="CIT email (name.departmentYYYY@citchennai.net)"
          required
        />

<input
  type="password"
  name="password"
  placeholder="Password"
  required
  minLength={6}
/>

{signUpError && (
  <div className="auth-error-message">
    ⚠ {signUpError}
  </div>
)}

{signUpMessage && (
  <div className="auth-success-message">
    ✓ {signUpMessage}
  </div>
)}

<button
  type="submit"
  className="primary-button"
  disabled={signUpLoading}
>
  {signUpLoading ? "Creating Account..." : "Create Account"}
</button>
      </form>
    </div>
  </div>
)}
  <div className="auth-divider">
    <span></span>
    <p>CODE • CONNECT • COLLABORATE</p>
    <span></span>
  </div>

</div>
    </div>
    </div></div>
  );
}

const profileViewData = viewedProfile || { ...profileData, email: authUser?.email || "" };
// The student-facing Batch value is derived from the CIT email, never from the editable academic-year label.
const profileViewBatchYear =
  getCITEmailIdentity(profileViewData.email)?.batchYear ||
  profileViewData.batchYear ||
  "Not detected";
const profileViewActivity = viewedProfile?.activityData || activityData;
const viewingOwnProfile = !viewedProfile || viewedProfile.id === authUser?.uid;

return (
  <div className={`app-shell ${lightMode ? "light-mode" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

      {/* ================= SIDEBAR ================= */}

      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>

        <div className="brand">
          <div className="brand-mark">
            <Rocket size={19} />
          </div>

          <div>
            <h2>CampusConnect</h2>
            <span>Code. Connect. Collaborate.</span>
          </div>
        </div>

        <div className="sidebar-section-label">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">

  {/* HOME */}
  <button
    className={activeNav === "home" ? "nav-item active" : "nav-item"}
    onClick={() => handleNavigation("home")}
  >
    <Home size={18} />
    <span>Home</span>
  </button>


  {/* HACKATHONS */}
  <button
    className={
      activeNav === "hackathons"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("hackathons")}
  >
    <Trophy size={18} />
    <span>Hackathons</span>
  </button>


  {/* TEAMS */}
  <button
    className={
      activeNav === "teams"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("teams")}
  >
    <Users size={18} />
    <span>Teams</span>
  </button>


  {/* MESSAGES */}
  <button
    className={
      activeNav === "messages"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("messages")}
  >
    <MessageCircle size={18} />
    <span>Messages</span>
    {directConversations.reduce(
      (total, conversation) =>
        total + Number(conversation.unreadCounts?.[authUser?.uid] || 0),
      0
    ) > 0 && (
      <span className="nav-unread-badge">
        {Math.min(
          99,
          directConversations.reduce(
            (total, conversation) =>
              total + Number(conversation.unreadCounts?.[authUser?.uid] || 0),
            0
          )
        )}{directConversations.reduce(
          (total, conversation) =>
            total + Number(conversation.unreadCounts?.[authUser?.uid] || 0),
          0
        ) > 99 ? "+" : ""}
      </span>
    )}
  </button>


  {/* CAMPUS HUB */}
  <button
    className={
      activeNav === "resources"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("resources")}
  >
    <BookOpen size={18} />
    <span>Campus Hub</span>
  </button>


  {/* PROFILE */}
  <button
    className={
      activeNav === "profile"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => {
  setViewedProfile(null);
  setActiveNav("profile");
  setProfilePageOpen(true);
  scrollToPageTop();
}}
  >
    <User size={18} />
    <span>Profile</span>
  </button>

</nav>

        <button
          type="button"
          className="nav-item feedback-support-nav-item"
          onClick={() => setFeedbackSupportOpen(true)}
          aria-label="Feedback & Support"
          title="Feedback & Support"
        >
          <CircleHelp size={18} />
          <span>Feedback &amp; Support</span>
        </button>

        <div className="sidebar-spacer" />

        <div className="sidebar-promo">

          <div className="promo-icon">
            <Rocket size={18} />
          </div>

          <strong>Great ideas come from great teams.</strong>

          <p>
            Build. Collaborate. Win.
          </p>

        </div>

        

      </aside>


      {/* ================= MAIN ================= */}

<main className="main-content">

{profilePageOpen && (
  <div className="profile-page-view">

    <div className="profile-page-header">
      <div>
        <span className="eyebrow">
          STUDENT PROFILE
        </span>

        <h1>{viewingOwnProfile ? "Your Profile" : `${profileViewData.name || "Student"}'s Profile`}</h1>

        <p>
          {viewingOwnProfile
            ? "Manage your CampusConnect identity, skills, and campus activity."
            : "View this student's CampusConnect profile and campus activity."}
        </p>

        {viewingOwnProfile && (
          <button
            type="button"
            className="profile-network-trigger profile-network-header-trigger"
            onClick={() => {
              setProfileNetworkOpen(true);
              setProfileNetworkTab("requests");
            }}
          >
            <Users size={15} />
            <span>Connections</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className="profile-back-button"
        onClick={() => {
          setProfilePageOpen(false);
          setViewedProfile(null);
          setActiveNav("home");
          scrollToPageTop();
        }}
      >
        Back to Home
      </button>
    </div>


    <div className="profile-dashboard-grid">

      <div className="profile-summary-card">

<div className="profile-avatar-large">
  {(profileViewData.name || "S").charAt(0).toUpperCase()}
</div>

        <span className="profile-status">
          ACTIVE STUDENT
        </span>

       <h2>{profileViewData.name}</h2>

        <p className="profile-role">
          {profileViewData.department || "Department not added"} • CampusConnect
        </p>

        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            borderRadius: "9px",
            border: "1px solid rgba(139, 92, 246, 0.22)",
            background: "rgba(139, 92, 246, 0.06)",
            fontSize: "12px",
          }}
        >
          <span style={{ opacity: 0.62, marginRight: "6px" }}>CampusConnect ID</span>
          <strong>{profileViewData.campusConnectId || "Generating..."}</strong>
        </div>

<p className="profile-about">
  {profileViewData.bio || "No bio added yet."}
</p>
{viewingOwnProfile && (
  <button
    type="button"
    className="profile-edit-button"
    onClick={() => {
      setProfileNameDraft(profileData.name || "");
      setProfileNameError("");
      setEditProfileOpen(true);
    }}
  >
    Edit Profile
  </button>
)}

      </div>


      <div className="profile-info-card">

        <div className="profile-card-title">
          <span className="eyebrow">
            INFORMATION
          </span>

          <h3>Student Details</h3>
        </div>

        <div className="profile-info-grid">

          <div className="profile-info-item">
            <span>COLLEGE</span>
            <strong>{profileViewData.college}</strong>
          </div>

          <div className="profile-info-item profile-email-item">
            <span>COLLEGE EMAIL</span>
            <strong>{profileViewData.email || "Email unavailable"}</strong>
          </div>

          <div className="profile-info-item">
            <span>DEPARTMENT</span>
            <strong>{profileViewData.department || "Not added"}</strong>
          </div>

          <div className="profile-info-item">
            <span>BATCH</span>
            <strong>{profileViewBatchYear}</strong>
          </div>

          <div className="profile-info-item">
            <span>ROLE</span>
            <strong>Student</strong>
          </div>

        </div>

      </div>

    </div>


    <div className="profile-activity-card">

      <div className="profile-card-title">
        <span className="eyebrow">
          CAMPUS ACTIVITY
        </span>

        <h3>Your Activity</h3>
      </div>

      <div className="profile-stats-grid">

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <Trophy size={18} />
          </div>

          <strong>{profileViewActivity.hackathonsJoined}</strong>
          <span>Hackathons Joined</span>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <Users size={18} />
          </div>

<strong>{profileViewActivity.teamsCreated}</strong>
          <span>Teams Created</span>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <BookOpen size={18} />
          </div>

<strong>{profileViewActivity.resourcesShared}</strong>
          <span>Resources Shared</span>
        </div>

      </div>

    </div>


    <div className="profile-skills-card">

      <div className="profile-card-title">

        <span className="eyebrow">
          EXPERTISE
        </span>

        <h3>Skills & Interests</h3>

      </div>

<div className="profile-skills-list">
  {(Array.isArray(profileViewData.skills)
    ? profileViewData.skills
    : (profileViewData.skills || "").split(",")
  )
    .map((skill) => skill?.toString().trim())
    .filter(Boolean)
    .map((skill) => (
      <span key={skill}>{skill}</span>
    ))}
</div>

    </div>

    <div className="profile-media-card">
      <div className="profile-card-title profile-media-card-title">
        <div>
          <span className="eyebrow">ACHIEVEMENTS & MEDIA</span>
          <h3>Achievements & Media</h3>
          <p>Certificates, hackathon photos, project screenshots, awards, internships, and other proof of your work.</p>
        </div>

        {viewingOwnProfile && (
          <label
            className={`profile-media-upload-button ${profileMediaUploading ? "disabled" : ""}`}
          >
            <Upload size={15} />
            <span>{profileMediaUploading ? "Uploading..." : "Add Media"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              disabled={profileMediaUploading}
              onChange={(event) => {
                uploadProfileMedia(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {profileMediaError && (
        <div className="profile-media-error">
          {profileMediaError}
        </div>
      )}

      {profileMediaLoading ? (
        <div className="profile-media-empty">
          <FileImage size={22} />
          <span>Loading achievements and media...</span>
        </div>
      ) : profileMedia.length === 0 ? (
        <div className="profile-media-empty">
          <FileImage size={24} />
          <strong>No achievements or media yet.</strong>
          <span>{viewingOwnProfile ? "Upload certificates, project screenshots, awards, or hackathon photos to showcase your work." : "This student has not added any achievement media yet."}</span>
        </div>
      ) : (
        <div className="profile-media-grid">
          {profileMedia.slice(0, 6).map((media, index) => {
            const isPdf = media.type === "pdf" || media.mimeType === "application/pdf";
            const showMoreOverlay = index === 5 && profileMedia.length > 6;

            return (
              <button
                type="button"
                className="profile-media-tile"
                key={media.id}
                onClick={() => {
                  if (showMoreOverlay) {
                    setMediaGalleryOpen(true);
                    return;
                  }
                  setSelectedMedia(media);
                }}
                aria-label={showMoreOverlay ? "See all achievements and media" : `Open ${media.title || media.fileName || "media"}`}
              >
                {isPdf ? (
                  <div className="profile-media-pdf-preview">
                    <FileImage size={30} />
                    <span>PDF</span>
                  </div>
                ) : (
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt={media.title || media.fileName || "Achievement media"}
                    loading="lazy"
                  />
                )}

                {showMoreOverlay && (
                  <span className="profile-media-more-overlay">
                    See more +{profileMedia.length - 6}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>

{viewingOwnProfile && (
  <>
    {profileNetworkOpen &&
      createPortal(
        <div
        className="profile-network-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setProfileNetworkOpen(false);
          }
        }}
      >
        <div
          className="profile-network-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Connections and requests"
        >
          <div className="profile-network-modal-header">
            <div>
              <span className="eyebrow">NETWORK</span>
              <h3>Connections</h3>
            </div>

            <button
              type="button"
              className="profile-network-close"
              onClick={() => setProfileNetworkOpen(false)}
              aria-label="Close connections"
            >
              <X size={17} />
            </button>
          </div>

          <div className="profile-network-tabs">
            <button
              type="button"
              className={
                profileNetworkTab === "requests" ? "active" : ""
              }
              onClick={() => setProfileNetworkTab("requests")}
            >
              Requests
              {connectionRequests.filter(
                (item) =>
                  (item.receiverId === authUser.uid ||
                    item.senderId === authUser.uid) &&
                  item.status === "pending"
              ).length > 0 && (
                <span>
                  {
                    connectionRequests.filter(
                      (item) =>
                        (item.receiverId === authUser.uid ||
                          item.senderId === authUser.uid) &&
                        item.status === "pending"
                    ).length
                  }
                </span>
              )}
            </button>

            <button
              type="button"
              className={
                profileNetworkTab === "connections" ? "active" : ""
              }
              onClick={() => setProfileNetworkTab("connections")}
            >
              Connections
              {connections.length > 0 && (
                <span>{connections.length}</span>
              )}
            </button>
          </div>

          <div className="profile-network-modal-body">
            {profileNetworkTab === "requests" ? (
              <>
                {connectionRequests.filter(
                  (item) =>
                    item.receiverId === authUser.uid &&
                    item.status === "pending"
                ).length === 0 &&
                connectionRequests.filter(
                  (item) =>
                    item.senderId === authUser.uid &&
                    item.status === "pending"
                ).length === 0 ? (
                  <div className="profile-network-empty">
                    <Users size={20} />
                    <span>No pending connection requests.</span>
                  </div>
                ) : (
                  <>
                    {connectionRequests
                      .filter(
                        (item) =>
                          item.receiverId === authUser.uid &&
                          item.status === "pending"
                      )
                      .map((request) => (
                        <div
                          className="profile-network-request"
                          key={`incoming-${request.id}`}
                        >
                          <div className="profile-network-avatar">
                            {(request.senderName || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="profile-network-person">
                            <strong>
                              {request.senderName || "Student"}
                            </strong>
                            <span>Wants to connect with you</span>
                          </div>

                          <div className="profile-network-actions">
                            <button
                              type="button"
                              className="profile-network-accept"
                              disabled={connectionActionLoading}
                              onClick={() =>
                                respondToConnectionRequest(
                                  request,
                                  "accepted"
                                )
                              }
                            >
                              <UserCheck size={14} />
                              Accept
                            </button>

                            <button
                              type="button"
                              className="profile-network-decline"
                              disabled={connectionActionLoading}
                              onClick={() =>
                                respondToConnectionRequest(
                                  request,
                                  "declined"
                                )
                              }
                            >
                              <UserX size={14} />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}

                    {connectionRequests
                      .filter(
                        (item) =>
                          item.senderId === authUser.uid &&
                          item.status === "pending"
                      )
                      .map((request) => (
                        <div
                          className="profile-network-request"
                          key={`outgoing-${request.id}`}
                        >
                          <div className="profile-network-avatar">
                            {(request.receiverName || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="profile-network-person">
                            <strong>
                              {request.receiverName || "Student"}
                            </strong>
                            <span>Request pending</span>
                          </div>

                          <button
                            type="button"
                            className="profile-network-cancel"
                            disabled={connectionActionLoading}
                            onClick={() =>
                              setConnectionRequestCancelTarget(request)
                            }
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      ))}
                  </>
                )}
              </>
            ) : (
              <>
                {connections.length === 0 ? (
                  <div className="profile-network-empty">
                    <Users size={20} />
                    <span>Your accepted connections will appear here.</span>
                  </div>
                ) : (
                  <div className="profile-network-connection-list">
                    {connections.map((connection) => {
                      const otherId = connection.userIds?.find(
                        (id) => id !== authUser.uid
                      );
                      const person = teammates.find(
                        (item) => item.id === otherId
                      );

                      return (
                        <div
                          className="profile-network-connection"
                          key={connection.id}
                        >
                          <div className="profile-network-avatar">
                            {(person?.name || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="profile-network-person">
                            <strong>
                              {person?.name || "Connected Student"}
                            </strong>
                            <span>
                              {person?.campusConnectId ||
                                "CampusConnect ID unavailable"}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="profile-network-view-profile"
                            onClick={() =>
                              openTeamMemberProfile({
                                memberId: otherId,
                                memberName: person?.name,
                              })
                            }
                          >
                            <User size={14} />
                            View Profile
                          </button>

                          <button
                            type="button"
                            className="profile-network-remove"
                            disabled={connectionActionLoading}
                            onClick={() => removeConnection(connection)}
                          >
                            <UserX size={14} />
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>,
        document.body
      )}
  </>
)}
  </div>
)}

{/* TOP BAR */}

        <header className="topbar">

          <div className="mobile-brand">
            <div className="brand-mark">
              <Rocket size={18} />
            </div>
            <strong>CampusConnect</strong>
          </div>

          <div className="topbar-actions">
<button
  className={`icon-button ${searchOpen ? "active-icon" : ""}`}
  onClick={() => setSearchOpen((prev) => !prev)}
  title="Search"
>
  <Search size={18} />
</button>

           <div className="notification-wrapper">
    <button
        className={`icon-button notification ${
            notificationOpen ? "active-icon" : ""
        }`}
        onClick={openNotifications}
        title="Notifications"
    >
        <Bell size={18} />
        {notifications.some((item) => !item.read) && <span />}
    </button>

    {notificationOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div>
              <strong>Notifications</strong>
              <span>{notifications.filter((item) => !item.read).length} new</span>
            </div>
            <div className="notification-header-actions">
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="notification-clear-button"
                  onClick={clearNotifications}
                  disabled={notificationClearLoading}
                  title="Clear all notifications"
                >
                  {notificationClearLoading ? "Clearing..." : "Clear all"}
                </button>
              )}
              <button
                className="notification-close"
                onClick={() => setNotificationOpen(false)}
                title="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 &&
            !connectionRequests.some(
              (item) =>
                item.receiverId === authUser.uid &&
                item.status === "pending"
            ) &&
            !teamInvitations.some(
              (item) =>
                item.inviteeId === authUser.uid &&
                item.status === "pending"
            ) ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((notification) => {
                const pendingConnectionRequest =
                  notification.type === "connection_request"
                    ? connectionRequests.find(
                        (item) =>
                          item.id === notification.relatedId &&
                          item.receiverId === authUser.uid &&
                          item.status === "pending"
                      )
                    : null;

                const pendingTeamInvitation =
                  notification.type === "team_invitation"
                    ? teamInvitations.find(
                        (item) =>
                          item.id === notification.relatedId &&
                          item.inviteeId === authUser.uid &&
                          item.status === "pending"
                      )
                    : null;

                const isMarketplaceEnquiry =
                  notification.type === "marketplace_enquiry";
                const isWantedEnquiry =
                  notification.type === "wanted_enquiry";

                return (
                  <div
                    className={`notification-item ${
                      notification.read ? "read" : ""
                    } ${
                      pendingConnectionRequest || pendingTeamInvitation || isMarketplaceEnquiry || isWantedEnquiry
                        ? "notification-item-actionable"
                        : ""
                    }`}
                    key={notification.id}
                    onClick={async () => {
                      await markNotificationRead(notification);
                      if (isMarketplaceEnquiry) {
                        setMarketplaceEnquiry(notification);
                        setNotificationOpen(false);
                      } else if (isWantedEnquiry) {
                        setMarketplaceEnquiry(notification);
                        setNotificationOpen(false);
                      }
                    }}
                  >
                    <div className="notification-dot" />

                    <div className="notification-content">
                      <strong>
                        {notification.title || "CampusConnect notification"}
                      </strong>

                      <p>
                        {notification.message ||
                          "You have a new CampusConnect update."}
                      </p>

                      <small>
                        {formatNotificationTime(notification.createdAt)}
                      </small>

                      {pendingConnectionRequest && (
                        <div
                          className="notification-inline-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              respondToConnectionRequest(
                                pendingConnectionRequest,
                                "accepted"
                              )
                            }
                            disabled={connectionActionLoading}
                          >
                            <UserCheck size={14} />
                            Accept
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              respondToConnectionRequest(
                                pendingConnectionRequest,
                                "declined"
                              )
                            }
                            disabled={connectionActionLoading}
                          >
                            <UserX size={14} />
                            Decline
                          </button>
                        </div>
                      )}

                      {pendingTeamInvitation && (
                        <div
                          className="notification-inline-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              respondToTeamInvitation(
                                pendingTeamInvitation,
                                "accepted"
                              )
                            }
                            disabled={teamInviteLoading}
                          >
                            <UserCheck size={14} />
                            Join
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              respondToTeamInvitation(
                                pendingTeamInvitation,
                                "declined"
                              )
                            }
                            disabled={teamInviteLoading}
                          >
                            <UserX size={14} />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Keep any pending request/invitation visible even if it is older
                than the eight most recent ordinary notifications. */}
            {notifications.length > 8 &&
              connectionRequests
                .filter(
                  (item) =>
                    item.receiverId === authUser.uid &&
                    item.status === "pending" &&
                    !notifications
                      .slice(0, 8)
                      .some((notification) => notification.relatedId === item.id)
                )
                .map((request) => (
                  <div
                    className="notification-item notification-item-actionable"
                    key={`pending-request-${request.id}`}
                  >
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <strong>New connection request</strong>
                      <p>
                        {request.senderName || "A student"} wants to connect
                        with you.
                      </p>
                      <small>Pending</small>

                      <div
                        className="notification-inline-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            respondToConnectionRequest(request, "accepted")
                          }
                          disabled={connectionActionLoading}
                        >
                          <UserCheck size={14} />
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            respondToConnectionRequest(request, "declined")
                          }
                          disabled={connectionActionLoading}
                        >
                          <UserX size={14} />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

            {notifications.length > 8 &&
              teamInvitations
                .filter(
                  (item) =>
                    item.inviteeId === authUser.uid &&
                    item.status === "pending" &&
                    !notifications
                      .slice(0, 8)
                      .some((notification) => notification.relatedId === item.id)
                )
                .map((invitation) => (
                  <div
                    className="notification-item notification-item-actionable"
                    key={`pending-invite-${invitation.id}`}
                  >
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <strong>
                        {invitation.teamTitle || "Hackathon Team"}
                      </strong>
                      <p>You've been invited to join this team.</p>
                      <small>Pending</small>

                      <div
                        className="notification-inline-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            respondToTeamInvitation(invitation, "accepted")
                          }
                          disabled={teamInviteLoading}
                        >
                          <UserCheck size={14} />
                          Join
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            respondToTeamInvitation(invitation, "declined")
                          }
                          disabled={teamInviteLoading}
                        >
                          <UserX size={14} />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          <div className="notification-footer">
            {notifications.length > 8 ? `Showing latest 8 of ${notifications.length}` : "CampusConnect activity"}
          </div>
        </div>
    )}
</div>

<button
    className={`icon-button ${lightMode ? "active-icon" : ""}`}
    onClick={() => setLightMode((prev) => !prev)}
    title="Toggle theme"
>
    <Sun size={18} />
</button>

            <div
  className="top-user"
  role="button"
  tabIndex={0}
  aria-label={`Open account menu for ${profileData.name || "student"}`}
  aria-haspopup="menu"
  aria-expanded={userMenuOpen}
  onClick={() => setUserMenuOpen((prev) => !prev)}
  onKeyDown={(event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setUserMenuOpen((prev) => !prev);
    }
  }}
>
<div className="top-avatar">
  {profileData.name.charAt(0).toUpperCase()}
</div>

<div>
  <strong>{profileData.name}</strong>
  <span>Student</span>
</div>

              <ChevronDown size={14} />
            {userMenuOpen && (
  <div
    className="user-dropdown"
    role="menu"
    aria-label="Account actions"
    onClick={(event) => event.stopPropagation()}
  >

    <button
      type="button"
      onClick={() => {
        setUserMenuOpen(false);
        setViewedProfile(null);
        setActiveNav("profile");
        setProfilePageOpen(true);
        scrollToPageTop();
      }}
    >
      <span className="user-dropdown-icon" aria-hidden="true">
        <UserRound size={16} strokeWidth={1.9} />
      </span>
      <span className="user-dropdown-label">View Profile</span>
    </button>

    <button
      type="button"
      onClick={() => {
  setUserMenuOpen(false);
  setAccountSettingsOpen(true);
}}
    >
      <span className="user-dropdown-icon" aria-hidden="true">
        <Settings size={16} strokeWidth={1.9} />
      </span>
      <span className="user-dropdown-label">Account Settings</span>
    </button>

    <div className="user-dropdown-divider" />

    <button
      type="button"
      onClick={() => {
  setUserMenuOpen(false);
  setSignOutOpen(true);
}}
    >
      <span className="user-dropdown-icon" aria-hidden="true">
        <LogOut size={16} strokeWidth={1.9} />
      </span>
      <span className="user-dropdown-label">Sign Out</span>
    </button>

  </div>
)}
            </div>


                </div>

      {searchOpen && (
        <>
          <div className="search-overlay" onClick={() => setSearchOpen(false)} />
          <div className="search-panel" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="search-close-floating"
            aria-label="Close search"
            title="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <X size={19} strokeWidth={2.2} />
          </button>
          <div className="search-header">
            <Search size={19} />
            <input
              type="text"
              autoFocus
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={
                searchCategory === "students"
                  ? "Search by name, CampusConnect ID or skill..."
                  : "Search students and hackathons..."
              }
              style={{ flex: 1 }}
            />
          </div>

          {searchCategory === "students" && (
            <div className="find-teammates-box">
              <div className="find-teammates-header">
                <div className="find-teammates-title">
                  <div className="find-teammates-logo" aria-hidden="true">
                    <Users size={18} strokeWidth={2} />
                  </div>
                  <strong>Find teammates</strong>
                  <span>Fill any one field, or combine filters to narrow the results.</span>
                </div>
              </div>

              <div className="teammate-filters">
                <StyledSelect
                  value={teammateDepartmentFilter}
                  options={["All Departments", ...teammateDepartments]}
                  onChange={(value) =>
                    setTeammateDepartmentFilter(value === "All Departments" ? "" : value)
                  }
                  ariaLabel="Filter teammates by department"
                  placeholder="All Departments"
                />

                <StyledSelect
                  value={teammateYearFilter}
                  options={["All Years", ...teammateYears]}
                  onChange={(value) =>
                    setTeammateYearFilter(value === "All Years" ? "" : value)
                  }
                  ariaLabel="Filter teammates by year"
                  placeholder="All Years"
                />

                <input
                  type="text"
                  value={teammateSkillFilter}
                  onChange={(e) => setTeammateSkillFilter(e.target.value)}
                  placeholder="Skill filter"
                />
              </div>
            </div>
          )}

          {((searchCategory === "students" && teammateSearchActive) ||
            (searchCategory !== "students" && searchText.trim())) && (
            <div className="search-results">
              {(searchCategory === "students" || searchCategory === "all") &&
                filteredTeammates.map((person) => {
                  const Icon = person.icon || Code2;

                  return (
                    <button
                      type="button"
                      key={`student-${person.id}`}
                      className="search-result"
                      onClick={() => {
                        setSearchOpen(false);
                        setSelectedStudent(person);
                      }}
                      style={{
                        minHeight: "66px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "11px",
                        textAlign: "left",
                      }}
                    >
                      <div
                        className="search-result-icon"
                        style={{ width: "38px", height: "38px", flexShrink: 0 }}
                      >
                        <Icon size={17} />
                      </div>

                      <div className="search-result-info" style={{ minWidth: 0, flex: 1 }}>
                        <strong
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {person.name}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: "2px",
                            fontSize: "11px",
                            opacity: 0.68,
                          }}
                        >
                          {person.department || "Student"} • {person.year || "Year not added"}
                        </span>
                        <span
                          style={{
                            display: "block",
                            marginTop: "3px",
                            fontSize: "11px",
                            opacity: 0.58,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {person.campusConnectId || "CampusConnect ID pending"}
                          {person.skills.length > 0 ? ` • ${person.skills.slice(0, 3).join(" • ")}` : ""}
                        </span>
                      </div>

                      <span style={{ fontSize: "11px", opacity: 0.58, flexShrink: 0 }}>View</span>
                    </button>
                  );
                })}

              {searchCategory === "students" && filteredTeammates.length === 0 && (
                <div className="search-empty" style={{ padding: "24px 12px" }}>
                  No students match those filters.
                </div>
              )}

              {(searchCategory === "hackathons" || searchCategory === "all") &&
                filteredSearchHackathons.map((hackathon) => {
                  const Icon = getDataIcon(hackathon.icon, Trophy);
                  return (
                    <button
                      type="button"
                      key={`hackathon-${hackathon.id || hackathon.name}`}
                      className="search-result"
                      onClick={() => {
                        setSearchOpen(false);
                        setSelectedHackathon(hackathon);
                      }}
                    >
                      <div className="search-result-icon"><Icon size={18} /></div>
                      <div className="search-result-info">
                        <strong>{hackathon.name}</strong>
                        <span>{hackathon.description}</span>
                      </div>
                      <Trophy size={16} />
                    </button>
                  );
                })}

              {searchCategory === "hackathons" && filteredSearchHackathons.length === 0 && (
                <div className="search-empty">No hackathons found</div>
              )}

                            {searchCategory === "all" &&
                filteredTeammates.length === 0 &&
                filteredSearchHackathons.length === 0 && (
                  <div className="search-empty">No results found</div>
                )}
            </div>
          )}

          {searchCategory === "students" && !teammateSearchActive && (
            <div className="search-helper-message">
              Enter a name, CampusConnect ID, skill, department, or year to see results.
            </div>
          )}
          </div>
        </>
      )}

    </header>


        {/* ================= DASHBOARD ================= */}

        <div className="dashboard">

          {/* HERO */}

          <section className="dashboard-hero" id="home">

            <div className="hero-copy">

              <span className="eyebrow">
                STUDENT COMMUNITY
              </span>

              <h1>
                Connect.
                <br />
                Collaborate.
                <span> Create.</span>
              </h1>

              <p>
                Find teammates, build your dream team,
                and participate in amazing hackathons
                together.
              </p>

              <div className="hero-actions">

                <button
                  className="primary-button"
                  onClick={() => {
                    setSearchCategory("students");
                    setSearchText("");
                    setTeammateDepartmentFilter("");
                    setTeammateYearFilter("");
                    setTeammateSkillFilter("");
                    setSearchOpen(true);
                  }}
                >
                  <Users size={17} />
                  Find Teammates
                </button>

                <button
                  className="secondary-button"
                  onClick={() => handleNavigation("hackathons")}
                >
                  <Trophy size={17} />
                  Hackathons
                </button>

              </div>

            </div>


            {/* HERO VISUAL */}

            <div className="hero-visual">

              <div className="glow glow-one" />
              <div className="glow glow-two" />

              <div className="orbit orbit-one">
                <div className="floating-icon">
                  <Code2 size={20} />
                </div>
              </div>

              <div className="orbit orbit-two">
                <div className="floating-icon">
                  <Users size={20} />
                </div>
              </div>

              <div className="hero-visual-card">

                <div className="visual-icon">
                  <Rocket size={28} />
                </div>

                <h3>
                  Build Something
                  <br />
                  Amazing.
                </h3>

                <p>
                  Ideas become reality
                  when students connect.
                </p>

              </div>

            </div>

          </section>


          {/* STATS */}

          <section className="stats-grid">

            <div className="stat-card purple">

              <div className="stat-icon">
                <Users size={19} />
              </div>

              <div>
                <strong>{dataLoading ? "..." : dashboardStats.activeStudents}</strong>
                <span>Active Students</span>
                <small>Building the future together</small>
              </div>

            </div>

            <div className="stat-card blue">

              <div className="stat-icon">
                <Trophy size={19} />
              </div>

              <div>
                <strong>{dataLoading ? "..." : dashboardStats.hackathons}</strong>
                <span>Hackathons</span>
                <small>Exciting challenges await</small>
              </div>

            </div>

            <div className="stat-card green">

              <div className="stat-icon">
                <BookOpen size={19} />
              </div>

              <div>
                <strong>{dataLoading ? "..." : dashboardStats.resourcesShared}</strong>
                <span>Resources Shared</span>
                <small>Useful material from students</small>
              </div>

            </div>

            <div className="stat-card orange">

              <div className="stat-icon">
                <Rocket size={19} />
              </div>

              <div>
                <strong>{dataLoading ? "..." : dashboardStats.teamsFormed}</strong>
                <span>Teams Formed</span>
                <small>Ideas turned into reality</small>
              </div>

            </div>

          </section>


          {dataError && (
            <div className="search-empty" style={{ marginTop: "14px" }}>
              {dataError}
            </div>
          )}

          {/* HACKATHONS */}

          <section
            className="lower-section"
            id="hackathons"
          >

            <div className="section-heading">

              <span className="eyebrow">
                OPPORTUNITIES
              </span>

              <h2>
                Discover Opportunities
              </h2>

              <p>
                Live registration opportunities from the CIT Competition Dashboard.
                Expired registrations are automatically removed from this active view.
              </p>

            </div>

            <div className="opportunity-toolbar">
              <div className="opportunity-search">
                <Search size={15} />
                <input
                  type="search"
                  value={opportunitySearch}
                  onChange={(event) => {
                    setOpportunitySearch(event.target.value);
                    setShowAllOpportunities(false);
                  }}
                  placeholder="Search competitions, organizers, categories..."
                  aria-label="Search opportunities"
                />
                {opportunitySearch && (
                  <button
                    type="button"
                    onClick={() => setOpportunitySearch("")}
                    aria-label="Clear opportunity search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <StyledSelect
                value={
                  opportunitySort === "deadline"
                    ? "Deadline soonest"
                    : opportunitySort === "name"
                    ? "Name A–Z"
                    : "Prize / value"
                }
                options={["Deadline soonest", "Name A–Z", "Prize / value"]}
                onChange={(value) =>
                  setOpportunitySort(
                    value === "Name A–Z"
                      ? "name"
                      : value === "Prize / value"
                      ? "prize"
                      : "deadline"
                  )
                }
                ariaLabel="Sort opportunities"
              />
            </div>

            {/* LIVE HACKATHON FILTERS */}
            {(hackathonFilterOptions.categories.length > 0 ||
              hackathonFilterOptions.years.length > 0) && (
              <div className="opportunity-filters">
                <StyledSelect
                  value={hackathonCategoryFilter}
                  options={hackathonFilterOptions.categories}
                  onChange={setHackathonCategoryFilter}
                  ariaLabel="Filter competitions by category"
                  placeholder="All categories"
                />
                <StyledSelect
                  value={hackathonYearFilter}
                  options={hackathonFilterOptions.years}
                  onChange={setHackathonYearFilter}
                  ariaLabel="Filter competitions by year"
                  placeholder="All years"
                />
              </div>
            )}

            <div className="opportunity-summary">
              <div>
                <strong>{showAllCompetitions ? filteredAllCompetitionHackathons.length : filteredOpportunityHackathons.length}</strong>
                <span>{showAllCompetitions ? " competitions shown" : " active registrations"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {showAllCompetitions && (
                  <span style={{ fontSize: "11px", opacity: 0.72 }}>
                    Total {allCompetitions.length} · Active {activeCompetitionCount} · Closed {closedCompetitionCount}
                  </span>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={toggleAllCompetitionsView}
                  disabled={allCompetitionsLoading}
                >
                  {allCompetitionsLoading
                    ? "Loading competitions…"
                    : showAllCompetitions
                    ? "Show Active Registrations"
                    : allCompetitions.length
                    ? `View All ${allCompetitions.length} Competitions`
                    : "View All Competitions"}
                </button>
                <a href={COMPETITION_SHEET_URL} target="_blank" rel="noopener noreferrer">
                  View source dashboard <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {!showAllCompetitions && closingSoonOpportunities.length > 0 && (
              <div className="opportunity-closing-soon">
                <div className="opportunity-closing-heading">
                  <div>
                    <span className="eyebrow">CLOSING SOON</span>
                    <strong>Registration closes within 7 days</strong>
                  </div>
                  <span>{closingSoonOpportunities.length}</span>
                </div>
                <div className="opportunity-closing-list">
                  {closingSoonOpportunities.slice(0, 4).map((item) => (
                    <button
                      type="button"
                      key={`closing-${item.id}`}
                      onClick={() => setSelectedHackathon(item)}
                    >
                      <span>{item.name}</span>
                      <strong>
                        {item.daysRemaining === 0
                          ? "Today"
                          : `${item.daysRemaining}d left`}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SAVED INTERESTS */}
            <div
              style={{
                margin: "0 0 24px",
                padding: "14px 16px",
                border: "1px solid rgba(139, 92, 246, 0.22)",
                borderRadius: "14px",
                background: "rgba(139, 92, 246, 0.055)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: hackathonInterestIds.size ? "12px" : "0",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>
                    ⭐ Your Saved Interests
                  </strong>
                  <span style={{ fontSize: "11px", opacity: 0.68 }}>
                    Hackathons you've saved with the star
                  </span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.8 }}>
                  {hackathonInterestIds.size} saved
                </span>
              </div>

              {hackathonInterestIds.size === 0 ? (
                <div style={{ fontSize: "12px", opacity: 0.62 }}>
                  No saved hackathons yet. Tap the ☆ star on a challenge to save it.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "9px",
                  }}
                >
                  {hackathons
                    .filter((hackathon) => hackathonInterestIds.has(hackathon.id))
                    .map((hackathon) => (
                      <button
                        key={`saved-${hackathon.id}`}
                        type="button"
                        onClick={() => setSelectedHackathon(hackathon)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "8px 11px",
                          borderRadius: "9px",
                          border: "1px solid rgba(139, 92, 246, 0.28)",
                          background: "rgba(255, 255, 255, 0.035)",
                          color: "inherit",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        <Trophy size={13} />
                        {hackathon.name || "Hackathon"}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="event-grid">

              {displayedCompetitionList.length === 0 && !dataLoading && !allCompetitionsLoading && (
                <div className="search-empty">
                  {dataError || "No hackathons available yet."}
                </div>
              )}

              {visibleOpportunityHackathons.map((hackathon) => {
                const Icon = getDataIcon(hackathon.icon, Trophy);

                return (
                  <div className="event-card" key={hackathon.id}>

                    <div className="event-icon">
                      <Icon size={21} />
                    </div>

                    <button
                      type="button"
                      className={`opportunity-favorite-button ${hackathonInterestIds.has(hackathon.id) ? "is-saved" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleHackathonInterest(hackathon);
                      }}
                      disabled={hackathonInterestLoading}
                      aria-label={
                        hackathonInterestIds.has(hackathon.id)
                          ? `Remove ${hackathon.name || "hackathon"} from saved opportunities`
                          : `Save ${hackathon.name || "hackathon"}`
                      }
                      title={hackathonInterestIds.has(hackathon.id) ? "Remove from saved" : "Save opportunity"}
                    >
                      <Star size={16} fill={hackathonInterestIds.has(hackathon.id) ? "currentColor" : "none"} />
                    </button>

                    <div>
                      <span className="event-date">
                        {hackathon.date || "DATE TBA"}
                      </span>
                      {showAllCompetitions && !hackathon.activeForRegistration && (
                        <span style={{ display: "inline-flex", width: "fit-content", marginTop: "6px", padding: "4px 7px", borderRadius: "6px", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", border: "1px solid rgba(248, 113, 113, 0.25)", background: "rgba(248, 113, 113, 0.08)", color: "inherit" }}>
                          Registration Closed
                        </span>
                      )}

                      <h3>
                        {hackathon.name || "Untitled Hackathon"}
                      </h3>

                      <p>
                        {hackathon.description || "Competition details will be announced soon."}
                      </p>

                      <div className="opportunity-card-meta">
                        {hackathon.eligibleYear && <span>{hackathon.eligibleYear}</span>}
                        {hackathon.category && <span>{hackathon.category}</span>}
                        {hackathon.prizeAmount && <span>{hackathon.prizeAmount}</span>}
                      </div>

                      <div className="opportunity-card-deadline">
                        <Clock3 size={12} />
                        {!hackathon.activeForRegistration
                          ? "Registration Closed"
                          : hackathon.daysRemaining === 0
                          ? "Registration closes today"
                          : `Registration closes ${formatOpportunityDate(hackathon.registrationDeadline)}`}
                      </div>
                    </div>

                    <div className="event-card-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedHackathon(hackathon)}
                      >
                        View Challenge
                      </button>
                    </div>

                  </div>
                );
              })}

            </div>

            {(
              showAllCompetitions
                ? visibleOpportunityHackathons.length < displayedCompetitionList.length
                : filteredOpportunityHackathons.length > 12
            ) && (
              <div className="opportunity-show-more-wrap">
                <span>
                  Showing {visibleOpportunityHackathons.length} of{" "}
                  {showAllCompetitions
                    ? displayedCompetitionList.length
                    : filteredOpportunityHackathons.length}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (showAllCompetitions) {
                      setAllCompetitionVisibleCount((prev) =>
                        Math.min(
                          prev + 10,
                          displayedCompetitionList.length
                        )
                      );
                    } else {
                      setShowAllOpportunities((prev) => !prev);
                    }
                  }}
                >
                  {showAllCompetitions
                    ? `Show ${Math.min(
                        10,
                        displayedCompetitionList.length -
                          visibleOpportunityHackathons.length
                      )} More`
                    : showAllOpportunities
                    ? "Show Less"
                    : "Show More"}

                  <ChevronDown
                    size={14}
                    style={{
                      transform:
                        !showAllCompetitions && showAllOpportunities
                          ? "rotate(180deg)"
                          : "none",
                    }}
                  />
                </button>
              </div>
            )}

          </section>


          {/* CREATE TEAM */}

          <section className="create-team-card teams-create-section" id="teams">

            <div className="section-heading centered">

              <span className="eyebrow">
                TEAMS
              </span>

              <h2>
                Create Your Hackathon Team
              </h2>

              <p>
                Have a great idea? Create your team
                and find the right people to build it with.
              </p>

            </div>

            <form
              className="team-form"
              onSubmit={handleCreateTeam}
            >

              <div className="input-group">

                <label>Team Name</label>

                <div className="input-wrapper">
                  <User size={17} />

                  <input
                    type="text"
                    name="title"
                    placeholder="Enter your team name"
                    required
                  />
                </div>

              </div>

              <div className="input-group">

                <label>Hackathon Idea</label>

                <div className="input-wrapper">
                  <Rocket size={17} />

<input
  type="text"
  name="idea"
  placeholder="Describe your hackathon idea"
  required
/>
                </div>

              </div>

              <div className="input-group">

                <label>Required Skills</label>

                <div className="input-wrapper">
                  <Code2 size={17} />

<input
  type="text"
  name="skills"
  placeholder="React, Python, UI/UX..."
  required
/>
                </div>

              </div>

              <div className="input-group">

                <label>Number of Team Members</label>

                <div className="input-wrapper">
                  <Users size={17} />

<input
  type="number"
  name="members"
  min="1"
  max="10"
  placeholder="e.g. 4"
  required
/>
                </div>

              </div>

              <button
                type="submit"
                className="create-button"
              >
                <Plus size={18} />

                {teamCreated
                  ? "Team Created!"
                  : "Create Team"}
              </button>

            </form>

{teamCreated && createdTeam && (
  <div className="success-message">
    <CheckCircle2 size={18} />

    <div>
      <strong>{createdTeam.title}</strong>

      <div>
        Idea: {createdTeam.idea}
      </div>

      <div>
        Skills: {createdTeam.skills}
      </div>

      <div>
        Team Members: {createdTeam.members}
      </div>

      <div>
        Team ID: {createdTeam.teamConnectId}
      </div>

      <div>
        Your team has been created successfully!
      </div>
    </div>
  </div>
)}

          </section>


          {/* TEAMS */}

          <section className="lower-section teams-section" id="team-community">
            <div className="teams-hero-heading">
              <span className="eyebrow">COLLABORATE</span>
              <h2>Build. Connect. Collaborate.</h2>
              <p>
                Create teams, discover collaborators, and turn your ideas into projects together.
              </p>
            </div>

            <div className="team-id-search-card">
              <div className="team-id-search-copy">
                <span className="eyebrow">TEAM LOOKUP</span>
                <h3>Find a team by Team ID</h3>
                <p>Every team has a unique ID, so you can find the exact team even when names are the same.</p>
              </div>
              <div className="team-id-search-control">
                <span className="team-id-prefix">TEAM-</span>
                <input
                  type="text"
                  value={teamSearchId}
                  onChange={(e) => setTeamSearchId(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 8))}
                  placeholder="e.g. 7F3K9P2Q"
                  maxLength={8}
                  aria-label="Team ID suffix"
                />
                {teamSearchValue && (
                  <button
                    type="button"
                    className="team-id-clear"
                    onClick={() => setTeamSearchId("")}
                    aria-label="Clear Team ID search"
                  >
                    <X size={15} />
                  </button>
                )}
                <Search size={18} />
              </div>
              {teamSearchValue && (
                <div className="team-id-search-results">
                  {teamSearchResults.length === 0 ? (
                    <div className="team-search-empty">
                      <Users size={18} />
                      <span>No team found matching <strong>TEAM-{teamSearchValue}</strong>.</span>
                    </div>
                  ) : (
                    teamSearchResults.map((team) => (
                      <div className="team-search-result" key={team.id}>
                        <div className="team-card-icon"><Rocket size={17} /></div>
                        <div className="team-search-result-info">
                          <strong>{team.title || "Hackathon Team"}</strong>
                          <span>{team.idea || "No idea description yet."}</span>
                          <small>{team.teamConnectId || "Team ID unavailable"}</small>
                        </div>
                        {team.createdBy === authUser.uid ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button type="button" className="secondary-button" onClick={() => openTeamStatus(team)}>
                              Team Status
                            </button>
                            <button type="button" className="secondary-button" onClick={() => openTeamChat(team)}>
                              <MessageCircle size={14} />
                              Chat
                            </button>
                          </div>
                        ) : userTeams.some((mine) => mine.id === team.id) ? (
                          <button type="button" className="secondary-button" onClick={() => openTeamChat(team)}>
                            <MessageCircle size={14} />
                            Chat
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button type="button" className="secondary-button" onClick={() => openTeamPreview(team)}>
                              View Team
                            </button>
                            <button type="button" className="primary-button" disabled={teamActionLoading} onClick={() => joinTeam(team)}>
                              {teamActionLoading ? "Joining..." : "Join Team"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {teamSearchValue.length < 8 && teamSearchResults.length > 0 && (
                    <div className="team-id-search-hint">
                      Keep typing the Team ID to narrow the result.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="teams-grid-layout">
              <div className="team-section-card">
                <div className="team-section-header">
                  <div>
                    <span className="eyebrow">MY TEAMS</span>
                    <h3>Teams you're part of</h3>
                  </div>
                  <span className="team-count-badge">{userTeams.length}</span>
                </div>

                {userTeams.length === 0 ? (
                  <div className="team-empty-state">
                    <Users size={20} />
                    <strong>No teams yet</strong>
                    <span>Create a team or join an open team below.</span>
                  </div>
                ) : (
                  <div className="team-card-list">
                    {userTeams.map((team) => {
                      const memberCount = Array.isArray(team.memberIds)
                        ? team.memberIds.length
                        : team.createdBy === authUser.uid ? 1 : 1;
                      const maxMembers = Number(team.members) || 1;
                      const isOwner = team.createdBy === authUser.uid;

                      return (
                        <div
                          className={`team-modern-card ${!isOwner ? "team-member-clickable" : ""}`}
                          key={team.id}
                          role={!isOwner ? "button" : undefined}
                          tabIndex={!isOwner ? 0 : undefined}
                          onClick={(event) => {
                            if (isOwner || event.target.closest("button")) return;
                            openTeamStatus(team);
                          }}
                          onKeyDown={(event) => {
                            if (isOwner || event.target.closest("button")) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openTeamStatus(team);
                            }
                          }}
                        >
                          <div className="team-card-icon"><Rocket size={18} /></div>
                          <div className="team-card-main">
                            <div className="team-card-title-row">
                              {isOwner ? (
                                <h4>{team.title || "Hackathon Team"}</h4>
                              ) : (
                                <h4
                                  className="team-title-view-text"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTeamStatus(team);
                                  }}
                                >
                                  <span>{team.title || "Hackathon Team"}</span>
                                  <span className="team-title-view-arrow" aria-hidden="true">→</span>
                                </h4>
                              )}
                              <span className={team.status === "Full" ? "team-status full" : "team-status open"}>
                                {team.status === "Full" ? "Full" : "Open"}
                              </span>
                            </div>
                            <p>{team.idea || "No idea description yet."}</p>
                            <div className="team-card-meta">
                              <span>👥 {memberCount}/{maxMembers} members</span>
                              <span>Team ID: <strong>{team.teamConnectId || "Generating..."}</strong></span>
                            </div>
                            <div className="team-card-skills">Skills: {team.skills || "Not specified"}</div>
                          </div>
                          <div
                            className="team-card-actions"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            {isOwner ? (
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button type="button" className="primary-button" onClick={() => openTeamStatus(team)}>
                                  Team Status
                                </button>
                                <button type="button" className="secondary-button" onClick={() => openTeamChat(team)}>
                                  <MessageCircle size={14} />
                                  Chat
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button type="button" className="secondary-button" onClick={() => openTeamChat(team)}>
                                  <MessageCircle size={14} />
                                  Chat
                                </button>
                                <button type="button" className="secondary-button" disabled={teamActionLoading} onClick={() => leaveTeam(team)}>
                                  Leave Team
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="team-section-card">
                <div className="team-section-header">
                  <div>
                    <span className="eyebrow">FIND A TEAM</span>
                    <h3>Open teams</h3>
                  </div>
                  <span className="team-count-badge">{openTeams.length}</span>
                </div>

                {openTeams.length === 0 ? (
                  <div className="team-empty-state">
                    <Users size={20} />
                    <strong>No open teams available</strong>
                    <span>Check back later or create your own team.</span>
                  </div>
                ) : (
                  <div className="team-card-list">
                    {openTeams.map((team) => {
                      const memberCount = Array.isArray(team.memberIds) ? team.memberIds.length : 1;
                      const maxMembers = Number(team.members) || 1;
                      const slots = Math.max(0, maxMembers - memberCount);

                      return (
                        <div className="team-modern-card" key={team.id}>
                          <div className="team-card-icon"><Rocket size={18} /></div>
                          <div className="team-card-main">
                            <div className="team-card-title-row">
                              <h4>{team.title || "Hackathon Team"}</h4>
                              <span className="team-status open">Open</span>
                            </div>
                            <p>{team.idea || "No idea description yet."}</p>
                            <div className="team-card-meta">
                              <span>👥 {memberCount}/{maxMembers} members</span>
                              <span>{slots} slot{slots === 1 ? "" : "s"} available</span>
                            </div>
                            <div className="team-card-meta team-card-id-row">
                              Team ID: <strong>{team.teamConnectId || `TEAM-${team.id.slice(0, 8).toUpperCase()}`}</strong>
                            </div>
                            <div className="team-card-skills">Skills: {team.skills || "Not specified"}</div>
                          </div>
                          <div className="team-card-actions">
                            <button type="button" className="secondary-button" onClick={() => openTeamPreview(team)}>
                              View Team
                            </button>
                            <button type="button" className="primary-button" disabled={teamActionLoading || slots <= 0} onClick={() => joinTeam(team)}>
                              {teamActionLoading ? "Joining..." : slots <= 0 ? "Team Full" : "Join Team"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>



          {/* ================= DIRECT MESSAGES ================= */}

          <section className="lower-section messages-section" id="messages">
            <div className="messages-section-heading">
              <div>
                <span className="eyebrow">DIRECT MESSAGES</span>
                <h2>Messages</h2>
                <p>Have private conversations with students you connect with.</p>
              </div>
            </div>

            <div className="messages-workspace">
              <aside className="messages-conversation-panel">
                <div className="messages-panel-header">
                  <div>
                    <strong>Conversations</strong>
                    <span>{directConversations.length} active</span>
                  </div>
                </div>

                <div className="messages-conversation-list">
                  {directConversationsLoading ? (
                    <div className="messages-empty-state">Loading conversations...</div>
                  ) : (
                    <>
                      <div className="messages-request-section">
                          <div className="messages-request-header">
                            <div>
                              <strong>Message Requests</strong>
                              <span>{incomingDirectMessageRequests.length} pending</span>
                            </div>
                          </div>
                          <div className="messages-request-list">
                            {incomingDirectMessageRequests.length === 0 ? (
                              <div className="messages-request-empty">No message requests yet.</div>
                            ) : incomingDirectMessageRequests.map((request) => (
                              <div className="messages-request-item" key={request.id}>
                                <div className="direct-conversation-avatar">
                                  {getDirectParticipantDisplayName(request.senderId, request.senderName).charAt(0).toUpperCase()}
                                </div>
                                <div className="messages-request-copy">
                                  <strong>{getDirectParticipantDisplayName(request.senderId, request.senderName)}</strong>
                                  <span>{request.message}</span>
                                  <div className="messages-request-actions">
                                    <button
                                      type="button"
                                      className="messages-request-accept"
                                      disabled={messageRequestActionLoading}
                                      onClick={() => respondToDirectMessageRequest(request, "accepted")}
                                    >
                                      <UserCheck size={12} /> Accept
                                    </button>
                                    <button
                                      type="button"
                                      className="messages-request-decline"
                                      disabled={messageRequestActionLoading}
                                      onClick={() => respondToDirectMessageRequest(request, "declined")}
                                    >
                                      <UserX size={12} /> Decline
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      {blockedStudentsForMessages.length > 0 && (
                        <div className="messages-blocked-section">
                          <div className="messages-blocked-header">
                            <div>
                              <strong>Blocked Students</strong>
                              <span>{blockedStudentsForMessages.length}</span>
                            </div>
                          </div>
                          <div className="messages-blocked-list">
                            {blockedStudentsForMessages.map((person) => (
                              <div className="messages-blocked-item" key={person.id}>
                                <div className="direct-conversation-avatar blocked-avatar">
                                  {(person.name || "C").charAt(0).toUpperCase()}
                                </div>
                                <div className="messages-blocked-copy">
                                  <strong>{person.name || "CampusConnect student"}</strong>
                                  <span>{person.campusConnectId || "Blocked by you"}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDirectConversationConfirm({
                                    action: "unblock",
                                    userId: person.id,
                                    userName: person.name || "this student",
                                  })}
                                  aria-label={`Unblock ${person.name || "student"}`}
                                >
                                  Unblock
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {connectedStudentsForMessages.length > 0 && (
                        <div className="messages-start-section">
                          <div className="messages-start-header">
                            <div>
                              <strong>Start a conversation</strong>
                              <span>{connectedStudentsForMessages.length} connected</span>
                            </div>
                          </div>

                          <div className="messages-start-list">
                            {connectedStudentsForMessages.map((person) => (
                              <div className="messages-start-item" key={person.id}>
                                <div className="direct-conversation-avatar">
                                  {(person.name || "C").charAt(0).toUpperCase()}
                                </div>
                                <div className="direct-conversation-copy">
                                  <strong>{person.name || "Connected Student"}</strong>
                                  <span>{blockedUserIds.includes(person.id) ? "Blocked by you · messaging allowed" : (person.campusConnectId || "CampusConnect student")}</span>
                                </div>
                                <button
                                  type="button"
                                  className="messages-start-button"
                                  onClick={() => openDirectConversation(person)}
                                  aria-label={`Message ${person.name || "connected student"}`}
                                  title={`Message ${person.name || "connected student"}`}
                                >
                                  <MessageCircle size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="messages-existing-header">
                        <strong>Conversations</strong>
                        <span>{directConversations.length} active</span>
                      </div>

                      {directConversations.length === 0 ? (
                        <div className="messages-empty-state messages-empty-state-compact">
                          <MessageCircle size={22} />
                          <strong>
                            {connectedStudentsForMessages.length > 0
                              ? "No active conversations yet"
                              : "No conversations yet"}
                          </strong>
                          <span>
                            {connectedStudentsForMessages.length > 0
                              ? "Tap the message icon above to start one."
                              : "Connect with a student to start messaging them."}
                          </span>
                        </div>
                      ) : (
                        directConversations.map((conversation) => {
                          const other = getDirectOtherParticipant(conversation);
                          const active = directConversation?.id === conversation.id;

                          return (
                            <button
                              type="button"
                              key={conversation.id}
                              className={`direct-conversation-item ${active ? "active" : ""}`}
                              onClick={async () => {
                                setDirectConversation(conversation);
                                if (authUser?.uid) {
                                  try {
                                    await updateDoc(
                                      doc(db, "directConversations", conversation.id),
                                      {
                                        [`unreadCounts.${authUser.uid}`]: 0,
                                        [`lastReadAt.${authUser.uid}`]: serverTimestamp(),
                                      }
                                    );
                                  } catch (error) {
                                    console.error("DIRECT MESSAGE READ UPDATE ERROR:", error);
                                  }
                                }
                              }}
                            >
                              <div className="direct-conversation-avatar">
                                {(other?.name || "C").charAt(0).toUpperCase()}
                              </div>
                              <div className="direct-conversation-copy">
                                <strong>{other?.name || "CIT Student"}</strong>
                                <span>{conversation.lastMessage || "Start a conversation"}</span>
                              </div>
                              {Number(conversation.unreadCounts?.[authUser?.uid] || 0) > 0 && (
                                <span className="direct-unread-badge">
                                  {conversation.unreadCounts[authUser.uid] > 99
                                    ? "99+"
                                    : conversation.unreadCounts[authUser.uid]}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              </aside>

              <div className="direct-chat-panel">
                {!directConversation ? (
                  <div className="direct-chat-empty">
                    <div className="direct-chat-empty-icon"><MessageCircle size={24} /></div>
                    <h3>Select a conversation</h3>
                    <p>Your one-to-one student messages will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="direct-chat-header">
                      <div className="direct-chat-person">
                        <div className="direct-conversation-avatar">
                          {(getDirectOtherParticipant(directConversation)?.name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{getDirectOtherParticipant(directConversation)?.name || "CIT Student"}</strong>
                          <span>CampusConnect student</span>
                        </div>
                      </div>
                      <div className="direct-chat-header-actions">
                        <div className="direct-conversation-action-wrap">
                          <button
                            type="button"
                            className="direct-conversation-action-button"
                            onClick={(event) => {
                              if (directConversationMenu) {
                                setDirectConversationMenu(false);
                                setDirectConversationMenuPosition(null);
                                return;
                              }

                              const rect = event.currentTarget.getBoundingClientRect();
                              const viewportWidth =
                                window.visualViewport?.width || window.innerWidth;
                              const viewportHeight =
                                window.visualViewport?.height || window.innerHeight;
                              const viewportPadding = 12;
                              const gap = 8;
                              const menuWidth = Math.min(
                                190,
                                Math.max(150, viewportWidth - viewportPadding * 2)
                              );
                              const menuHeight = 90;

                              // Prefer opening to the right of the options button.
                              // Only move left when the right side would leave the viewport.
                              let left = rect.right + gap;

                              if (left + menuWidth > viewportWidth - viewportPadding) {
                                left = rect.left - menuWidth - gap;
                              }

                              left = Math.max(
                                viewportPadding,
                                Math.min(
                                  left,
                                  viewportWidth - menuWidth - viewportPadding
                                )
                              );

                              const preferredTop = rect.bottom + gap;
                              let top = preferredTop;

                              if (top + menuHeight > viewportHeight - viewportPadding) {
                                top = rect.top - menuHeight - gap;
                              }

                              top = Math.max(
                                viewportPadding,
                                Math.min(
                                  top,
                                  viewportHeight - menuHeight - viewportPadding
                                )
                              );

                              setDirectConversationMenuPosition({
                                top,
                                left,
                              });
                              setDirectConversationMenu(true);
                            }}
                            aria-label="Conversation options"
                            aria-expanded={directConversationMenu}
                          >
                            <MoreVertical size={17} />
                          </button>

                          {directConversationMenu &&
                            directConversationMenuPosition &&
                            createPortal(
                              <div
                                className="direct-conversation-action-menu direct-conversation-action-menu-portal"
                                style={{
                                  top: `${directConversationMenuPosition.top}px`,
                                  left: `${directConversationMenuPosition.left}px`,
                                }}
                              >
                                {blockedUserIds.includes(getDirectOtherParticipant(directConversation)?.id) ? (
                                  <button type="button" onClick={() => requestDirectConversationAction("unblock")}>
                                    <UserCheck size={14} />
                                    Unblock Student
                                  </button>
                                ) : (
                                  <button type="button" className="danger" onClick={() => requestDirectConversationAction("block")}>
                                    <UserX size={14} />
                                    Block Student
                                  </button>
                                )}
                                <button type="button" className="danger" onClick={() => requestDirectConversationAction("delete")}>
                                  <Trash2 size={14} />
                                  Delete Chat for Me
                                </button>
                              </div>,
                              document.body
                            )}
                        </div>

                        <button type="button" className="messages-close-conversation" onClick={closeDirectConversation} aria-label="Close conversation">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="direct-chat-messages">
                      {directMessagesLoading ? (
                        <div className="messages-empty-state">Loading messages...</div>
                      ) : directMessages.length === 0 ? (
                        <div className="direct-chat-start-state">
                          <strong>Start the conversation</strong>
                          <span>Send a message to begin.</span>
                        </div>
                      ) : (
                        directMessages.map((message) => {
                          const own = message.senderId === authUser?.uid;
                          return (
                            <div className={`direct-message-row ${own ? "own" : ""}`} key={message.id}>
                              <div className="direct-message-content-wrap">
                                <div className="direct-message-bubble">
                                  {message.message && <div className="direct-message-text">{message.message}</div>}

                                  {Array.isArray(message.media) && message.media.length > 0 && (
                                    <div className={`direct-message-media-grid count-${Math.min(message.media.length, 3)}`}>
                                      {message.media.slice(0, 3).map((media, index) => (
                                        <a
                                          key={`${media.fileId || media.url}-${index}`}
                                          href={media.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="direct-message-media-link"
                                        >
                                          <img
                                            src={media.thumbnailUrl || media.url}
                                            alt={media.fileName || `Message image ${index + 1}`}
                                            className="direct-message-media-image"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {!own && (
                                  <div className="direct-message-menu-wrap">
                                    <button
                                      type="button"
                                      className="direct-message-menu-button"
                                      onClick={(event) => {
                                        if (directMessageMenu?.id === message.id) {
                                          setDirectMessageMenu(null);
                                          return;
                                        }

                                        const rect = event.currentTarget.getBoundingClientRect();
                                        const viewportWidth =
                                          window.visualViewport?.width || window.innerWidth;
                                        const viewportHeight =
                                          window.visualViewport?.height || window.innerHeight;
                                        const viewportPadding = 10;
                                        const gap = 8;
                                        const menuWidth = Math.min(
                                          148,
                                          Math.max(130, viewportWidth - viewportPadding * 2)
                                        );
                                        const menuHeight = 44;

                                        // Prefer the right-hand side so Report Message
                                        // does not cover the message bubble on phones.
                                        let left = rect.right + gap;

                                        if (left + menuWidth > viewportWidth - viewportPadding) {
                                          left = rect.left - menuWidth - gap;
                                        }

                                        left = Math.max(
                                          viewportPadding,
                                          Math.min(
                                            left,
                                            viewportWidth - menuWidth - viewportPadding
                                          )
                                        );

                                        let top = rect.top - menuHeight - gap;

                                        if (top < viewportPadding) {
                                          top = rect.bottom + gap;
                                        }

                                        top = Math.max(
                                          viewportPadding,
                                          Math.min(
                                            top,
                                            viewportHeight - menuHeight - viewportPadding
                                          )
                                        );

                                        setDirectMessageMenu({
                                          id: message.id,
                                          top,
                                          left,
                                        });
                                      }}
                                      aria-label="Message options"
                                    >
                                      <MoreVertical size={14} />
                                    </button>

                                    {directMessageMenu?.id === message.id &&
                                      createPortal(
                                        <div
                                          className="direct-message-menu direct-message-menu-portal"
                                          style={{
                                            top: `${directMessageMenu.top}px`,
                                            left: `${directMessageMenu.left}px`,
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDirectMessageReportReason("");
                                              setDirectMessageReportDescription("");
                                              setDirectMessageReportTarget(message);
                                              setDirectMessageMenu(null);
                                            }}
                                          >
                                            <Flag size={13} />
                                            Report message
                                          </button>
                                        </div>,
                                        document.body
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={directMessagesEndRef} />
                    </div>

                    <form
                      className="direct-chat-composer"
                      onSubmit={(event) => {
                        event.preventDefault();
                        sendDirectMessage();
                      }}
                    >
                      {directMessageMediaFiles.length > 0 && (
                        <div className="direct-message-selected-media">
                          {directMessageMediaFiles.map((file) => (
                            <span key={`${file.name}-${file.size}-${file.lastModified}`}>
                              <FileImage size={12} />
                              {file.name}
                              <button
                                type="button"
                                onClick={() =>
                                  setDirectMessageMediaFiles((prev) =>
                                    prev.filter(
                                      (item) =>
                                        `${item.name}-${item.size}-${item.lastModified}` !==
                                        `${file.name}-${file.size}-${file.lastModified}`
                                    )
                                  )
                                }
                                aria-label={`Remove ${file.name}`}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="direct-chat-composer-row">
                        <input
                          type="text"
                          value={directMessageInput}
                          onChange={(event) => setDirectMessageInput(event.target.value)}
                          placeholder="Write a message..."
                          maxLength={2000}
                          disabled={directMessageSending}
                        />

                        <label className="direct-message-media-button" title="Add up to 3 images">
                          <FileImage size={15} />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => {
                              handleDirectMessageMediaFiles(event.target.files);
                              event.target.value = "";
                            }}
                            disabled={directMessageSending}
                          />
                        </label>

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={directMessageSending || (!directMessageInput.trim() && directMessageMediaFiles.length === 0)}
                        >
                          <Send size={15} />
                          {directMessageSending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </section>
{/* ================= RESOURCES ================= */}

<section
  className="resources-section"
  id="resources"
>
  <div className="section-heading">
    <span className="eyebrow">
  STUDENT MARKETPLACE
</span>

<h2>
  Student Exchange
</h2>

<p>
  Buy, exchange, or find useful items shared by students across campus.
</p>
  </div>

<div className="resources-grid">

  {/* BUY & SELL */}

  <div
  className="resource-card"
  onClick={() => {
  setMarketplaceOpen(true);
}}
>
    <div className="resource-icon purple">
      <ShoppingBag size={22} />
    </div>

    <div className="resource-content">
      <h3>Buy & Sell</h3>

      <p>
        Buy or sell books, project kits, components,
        calculators, and other useful college items.
      </p>

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setMarketplaceOpen(true);
  }}
>
  Browse Marketplace
</button>
    </div>
  </div>


  {/* EXCHANGE */}

 <div
  className="resource-card"
  onClick={() => setExchangeOpen(true)}
>
    <div className="resource-icon pink">
      <ArrowLeftRight size={22} />
    </div>

    <div className="resource-content">
      <h3>Trade or Give</h3>

      <p>
        Trade useful items with another student or give
        something away for free.
      </p>

     <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setExchangeOpen(true);
  }}
>
  Browse Trade or Give
</button>
    </div>
  </div>


  {/* WANTED / LOOKING FOR */}
  <div
    className="resource-card"
    onClick={() => setWantedOpen(true)}
  >
    <div className="resource-icon blue">
      <Search size={22} />
    </div>

    <div className="resource-content">
      <h3>Wanted / Looking For</h3>

      <p>
        Post something you need and let students who have it
        reach out to you.
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWantedOpen(true);
        }}
      >
        Browse Wanted Posts
      </button>
    </div>
  </div>

</div>
  {/* ================= STUDENT EXCHANGE ================= */}

  <div className="exchange-section">

    <div className="section-heading exchange-heading">
      <span className="eyebrow">
  COMMUNITY RESOURCES
</span>

<h2>
  Discover & Share
</h2>

<p>
  Explore useful resources shared by students and faculty across campus.
</p>
            <div className="exchange-controls">

        <div className="exchange-search">
          <Search size={17} />
<input
  type="text"
  placeholder="Search community resources..."
  value={communitySearch}
  onChange={(e) => {
    const value = e.target.value;

    setCommunitySearch(value);

    if (value.trim() !== "") {
      setShowSharedResources(true);
    }
  }}
/>
        </div>

        <button
  type="button"
  className="share-resource-button"
  onClick={() => setShareResourceOpen(true)}
>
          <Plus size={17} />
          Share Resource
        </button>

      </div>

{/* ================= SHARED RESOURCES ================= */}

{showSharedResources && (
  <div className="shared-resources-section">

    <div className="shared-resources-heading">
      <span className="community-resource-category">
        SHARED BY CAMPUS COMMUNITY
      </span>

      <h3>Shared Resources</h3>

      <p>
        Explore useful resources shared by the CampusConnect community.
      </p>
    </div>

    <button
  type="button"
  className="back-to-categories"
  onClick={() => {
    setCommunityFilter("All");
    setShowSharedResources(false);
    setCommunitySearch("");
  }}
>
  ← Back to Categories
</button>


    <div className="shared-resources-grid">
      {filteredCommunityResources.length === 0 && (
  <div className="no-community-resources">
    <div className="no-community-resources-icon">
      <Search size={20} />
    </div>

    <h3>No resources found</h3>

    <p>
      We couldn't find any shared resources matching your
      search or selected category.
    </p>
  </div>
)}

      {filteredCommunityResources.map((resource, index) => (
<div
  className="shared-resource-card"
  key={resource.id || `${resource.title}-${index}`}
>

  {resource.userId === authUser?.uid && (
    <button
      type="button"
      className="shared-resource-delete shared-resource-delete-top"
      onClick={() => handleDeleteResource(resource)}
      aria-label={`Delete ${resource.title || "resource"}`}
      title="Delete resource"
    >
      <Trash2 size={15} />
    </button>
  )}

  {resource.coverImageThumbnailUrl || resource.coverImageUrl ? (
    <div className="shared-resource-cover-wrap">
      <img
        src={resource.coverImageThumbnailUrl || resource.coverImageUrl}
        alt={resource.title}
        className="shared-resource-cover"
      />
    </div>
  ) : (
    <div className="shared-resource-icon">
      <BookOpen size={22} />
    </div>
  )}

  <div className="shared-resource-content">

    <span className="community-resource-category">
      {resource.category}
    </span>

    <h3>
      {resource.title}
    </h3>

    {(() => {
      const description = resource.description || "";
      const textKey = `resource:${resource.id || index}`;
      const expanded = expandedExchangeTextKeys.has(textKey);
      const needsExpansion = description.length > 180;
      const visibleDescription =
        needsExpansion && !expanded
          ? `${description.slice(0, 180).trimEnd()}…`
          : description;

      return (
        <>
          <p>{visibleDescription}</p>
          {needsExpansion && (
            <button
              type="button"
              className="exchange-show-more shared-resource-show-more"
              onClick={() => toggleExpandedExchangeText(textKey)}
            >
              {expanded ? "Show less" : "Show more"}
              <ChevronDown size={12} className={expanded ? "expanded" : ""} />
            </button>
          )}
        </>
      );
    })()}

    <button
      type="button"
      className="shared-resource-author"
      onClick={() =>
        openTeamMemberProfile({
          memberId: resource.userId,
          memberName: resource.userName || resource.userEmail?.split("@")[0] || "CIT Student",
        })
      }
    >
      Shared by {resource.userName || resource.userEmail?.split("@")[0] || "CIT Student"}
      <span>{resource.userEmail || "Email unavailable"}</span>
      <strong>→</strong>
    </button>

  </div>

  <a
    href={resource.link}
    target="_blank"
    rel="noopener noreferrer"
    className="shared-resource-link"
  >
    View Resource →
  </a>

</div>
      ))}

    </div>

  </div>
)}

</div>   
    {/* COMMUNITY RESOURCE LIST */}

{communityFilter === "All" && communitySearch.trim() === "" && (
  <div className="community-resource-grid">

  {/* QUESTION PAPERS */}

{(communityFilter === "All" ||
  communityFilter === "Question Papers") &&
  (normalizedCommunitySearch === "" ||
    "question papers previous year question papers"
      .includes(normalizedCommunitySearch)) && (
  <div className="community-resource-card">

    <div className="community-resource-icon purple">
      <BookOpen size={22} />
    </div>

    <div className="community-resource-content">

      <span className="community-resource-category">
        QUESTION PAPERS
      </span>

      <h3>
        Previous Year Question Papers
      </h3>

      <p>
        Find previous-year university papers, internal exams,
        model papers, and important question sets shared by
        students and faculty.
      </p>

<button
  type="button"
  onClick={() => {
    setCommunityFilter("Question Papers");
    setShowSharedResources(true);
    setCommunitySearch("");
  }}
>
  Browse Papers
</button>

    </div>

  </div>
  )}


  {/* HACKATHON RESOURCES */}

{(communityFilter === "All" ||
  communityFilter === "Hackathon Resources") &&
  (normalizedCommunitySearch === "" ||
    "hackathon resources".includes(normalizedCommunitySearch)) && (

  <div className="community-resource-card">

    <div className="community-resource-icon blue">
      <Trophy size={22} />
    </div>

    <div className="community-resource-content">

      <span className="community-resource-category">
        HACKATHON RESOURCES
      </span>

      <h3>
        Hackathon Resources
      </h3>

      <p>
        Explore previous problem statements, project references,
        winning-project ideas, presentations, and useful hackathon
        material.
      </p>

      <button
  type="button"
  onClick={() => {
    setCommunityFilter("Hackathon Resources");
    setShowSharedResources(true);
    setCommunitySearch("");
  }}
>
  Explore Hackathons
</button>

    </div>

  </div>
  )}


  {/* PROJECTS & REFERENCES */}
  {(communityFilter === "All" ||
  communityFilter === "Projects & References") &&
  (normalizedCommunitySearch === "" ||
    "projects references projects and references"
      .includes(normalizedCommunitySearch)) && (

  <div className="community-resource-card">

    <div className="community-resource-icon green">
      <Code2 size={22} />
    </div>

    <div className="community-resource-content">

      <span className="community-resource-category">
        PROJECTS & REFERENCES
      </span>

      <h3>
        Projects & References
      </h3>

      <p>
        Discover previous project reports, documentation,
        presentations, project ideas, and useful references
        shared by the campus community.
      </p>

      <button
  type="button"
  onClick={() => {
    setCommunityFilter("Projects & References");
    setShowSharedResources(true);
    setCommunitySearch("");
  }}
>
  Explore Projects
</button>

    </div>

  </div>

)}
  
</div>
)}
  </div>
</section>
{marketplaceOpen && (
  <div className="exchange-modal-overlay">
    <div className="exchange-modal marketplace-modal">
      <div className="exchange-modal-header marketplace-modal-header">
        <div>
          <span className="community-resource-category">STUDENT MARKETPLACE</span>
          <h3>Buy & Sell</h3>
          <p className="marketplace-modal-subtitle">
            Fixed-price student listings. Meet on campus and arrange payment directly with the seller.
          </p>
        </div>

        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => {
            setMarketplaceOpen(false);
            setMarketplaceCreateOpen(false);
          }}
          aria-label="Close marketplace"
        >
          <X size={18} />
        </button>
      </div>

      <div className="marketplace-toolbar">
        <div>
          <strong>{marketplaceListings.filter((listing) => listing.listingType === "fixed").length}</strong>
          <span>active listings</span>
        </div>
        <button
          type="button"
          className="marketplace-primary-button"
          onClick={() => {
            resetMarketplaceForm();
            setMarketplaceCreateOpen(true);
          }}
        >
          <Plus size={16} />
          Sell an Item
        </button>
      </div>

      {marketplaceError && (
        <div className="marketplace-inline-error">{marketplaceError}</div>
      )}

      {marketplaceLoading ? (
        <div className="marketplace-empty-state">Loading live marketplace listings...</div>
      ) : marketplaceListings.filter((listing) => listing.listingType === "fixed").length === 0 ? (
        <div className="marketplace-empty-state">
          <ShoppingBag size={26} />
          <strong>No listings yet</strong>
          <span>Be the first student to list an item.</span>
        </div>
      ) : (
        <div className="marketplace-listings-grid">
          {marketplaceListings
            .filter((listing) => listing.listingType === "fixed")
            .map((listing) => (
              <div className="marketplace-product-card" key={listing.id}>
                {listing.sellerId === authUser?.uid && (
                  <button
                    type="button"
                    className="marketplace-listing-delete"
                    onClick={() => deleteMarketplaceListing(listing)}
                    aria-label={`Delete ${listing.title || "listing"}`}
                    title="Delete listing"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="marketplace-product-image-wrap">
                  {listing.imageThumbnails?.[0] || listing.imageUrls?.[0] ? (
                    <img
                      src={listing.imageThumbnails?.[0] || listing.imageUrls?.[0]}
                      alt={listing.title}
                      className="marketplace-product-image"
                    />
                  ) : (
                    <div className="marketplace-product-image-placeholder"><ShoppingBag size={25} /></div>
                  )}
                  <span className="marketplace-type-badge">{listing.category || "OTHER"}</span>
                </div>

                <div className="marketplace-product-body">
                  <div className="marketplace-product-topline">
                    <span>{listing.condition || "Used"}</span>
                    <strong>₹{Number(listing.price || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <h4>{listing.title}</h4>
                  <p>{listing.description}</p>
                  <div className="marketplace-seller-row">
                    <span>Seller</span>
                    <strong>{listing.sellerName || "CIT Student"}</strong>
                  </div>
                  <div className="marketplace-seller-email">
                    {listing.sellerEmail || "Email unavailable"}
                  </div>
                  <div className="marketplace-meta-row">
                    <span>{listing.handoverLocation || "CIT Campus"}</span>
                    <span>Fixed price</span>
                  </div>
                  {listing.sellerId !== authUser?.uid && (
                    <button
                      type="button"
                      className="marketplace-enquire-button"
                      onClick={() => sendMarketplaceEnquiry(listing)}
                    >
                      <MessageCircle size={14} />
                      Enquire
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}


    </div>
  </div>
)}

{marketplaceCreateOpen && (
  <div className="exchange-modal-overlay marketplace-create-overlay">
    <div className="exchange-modal marketplace-create-modal">
      <div className="exchange-modal-header">
        <div>
          <span className="community-resource-category">CREATE LISTING</span>
          <h3>Sell an Item</h3>
          <p className="marketplace-modal-subtitle">Add real product details so another student can buy it safely on campus.</p>
        </div>
        <button type="button" className="exchange-modal-close" onClick={() => setMarketplaceCreateOpen(false)} aria-label="Close create listing">
          <X size={18} />
        </button>
      </div>

      <div className="marketplace-form">
        <label>
          Product title
          <input value={marketplaceForm.title} onChange={(e) => handleMarketplaceFormChange("title", e.target.value)} placeholder="e.g. Arduino Uno Starter Kit" maxLength={120} />
        </label>

        <label>
          Description
          <textarea value={marketplaceForm.description} onChange={(e) => handleMarketplaceFormChange("description", e.target.value)} placeholder="Condition, included items, usage, defects, etc." maxLength={1000} rows={4} />
        </label>

        <div className="marketplace-form-grid">
          <label>
            Category
            <StyledSelect
              value={marketplaceForm.category}
              options={["Textbooks", "Project Kits", "Electronics", "Calculators", "Computers", "Accessories", "Sports", "Furniture", "Other"]}
              onChange={(value) => handleMarketplaceFormChange("category", value)}
              ariaLabel="Product category"
            />
          </label>

          <label>
            Condition
            <StyledSelect
              value={marketplaceForm.condition}
              options={["New", "Like New", "Good", "Fair", "For Parts"]}
              onChange={(value) => handleMarketplaceFormChange("condition", value)}
              ariaLabel="Product condition"
            />
          </label>
        </div>

        <label>
          Selling price (₹)
          <input type="number" min="1" value={marketplaceForm.price} onChange={(e) => handleMarketplaceFormChange("price", e.target.value)} placeholder="450" />
        </label>

        <div className="marketplace-payment-options marketplace-direct-payment-note">
          <span>Handover & payment</span>
          <div><strong>Arrange payment directly with the seller</strong></div>
          <small>CampusConnect does not collect, hold, or transfer payment. Discuss the details with the seller before meeting on campus.</small>
        </div>

        <label>
          Campus handover location
          <input value={marketplaceForm.handoverLocation} onChange={(e) => handleMarketplaceFormChange("handoverLocation", e.target.value)} placeholder="e.g. Main Block / Library" maxLength={120} />
        </label>

        <label className="marketplace-image-picker">
          <span>Product images <small>(1–6 images, max 10 MB each)</small></span>
          <input type="file" accept="image/*" multiple onChange={(e) => { handleMarketplaceFiles(e.target.files); e.target.value = ""; }} />
          <div className="marketplace-image-picker-box"><Upload size={18} /> {marketplaceForm.files.length ? `${marketplaceForm.files.length} image(s) selected` : "Choose product images"}</div>
        </label>

        {marketplaceForm.files.length > 0 && (
          <div className="marketplace-selected-files">
            {marketplaceForm.files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}
          </div>
        )}

        {marketplaceFormError && <div className="marketplace-inline-error">{marketplaceFormError}</div>}

        <div className="marketplace-safety-note">
          <Shield size={15} />
          <span>Use campus meeting locations only. Do not include personal home addresses or private contact details in the listing.</span>
        </div>

        <button type="button" className="marketplace-primary-button marketplace-submit-button" disabled={marketplaceCreating} onClick={createMarketplaceListing}>
          {marketplaceCreating ? "Creating listing..." : "Publish Listing"}
        </button>
      </div>
    </div>
  </div>
)}
{exchangeOpen && (
  <div className="exchange-modal-overlay">
    <div className="exchange-modal trade-give-modal">
      <div className="exchange-modal-header trade-give-modal-header">
        <div>
          <span className="community-resource-category">STUDENT EXCHANGE</span>
          <h3>Trade or Give</h3>
          <p>Trade an item with another student or give it away for free.</p>
        </div>
        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => {
            setExchangeOpen(false);
            setTradeGiveSelectedListing(null);
            setTradeGiveCreateOpen(false);
          }}
          aria-label="Close Trade or Give"
        >
          <X size={18} />
        </button>
      </div>

      <div className="trade-give-actions">
        <button
          type="button"
          className="trade-give-primary-action"
          onClick={() => {
            resetTradeGiveForm();
            setTradeGiveCreateOpen(true);
          }}
        >
          <Plus size={16} />
          Post an Item
        </button>
        <span>Choose Trade or Give when you post.</span>
      </div>

      {tradeGiveLoading ? (
        <div className="trade-give-empty">Loading live listings...</div>
      ) : tradeGiveListings.length === 0 ? (
        <div className="trade-give-empty">
          <strong>No Trade or Give listings yet.</strong>
          <span>Be the first student to post an item.</span>
        </div>
      ) : (
        <div className="trade-give-listings">
          {tradeGiveListings.map((listing) => {
            const image = listing.imageThumbnails?.[0] || listing.imageUrls?.[0];
            const isOwner = listing.ownerId === authUser?.uid;

            const description = listing.description || "";
            const textKey = `trade:${listing.id}`;
            const expanded = expandedExchangeTextKeys.has(textKey);
            const needsExpansion = description.length > 150;
            const visibleDescription =
              needsExpansion && !expanded
                ? `${description.slice(0, 150).trimEnd()}…`
                : description;

            return (
              <div
                key={listing.id}
                className="trade-give-listing-card"
                role="button"
                tabIndex={0}
                onClick={() => openTradeGiveListing(listing)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTradeGiveListing(listing);
                  }
                }}
              >
                {isOwner && (
                  <button
                    type="button"
                    className="exchange-listing-delete trade-give-listing-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteTradeGiveListing(listing);
                    }}
                    aria-label={`Delete ${listing.title || "listing"}`}
                    title="Delete listing"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="trade-give-listing-image-wrap">
                  {image ? (
                    <img src={image} alt={listing.title} className="trade-give-listing-image" />
                  ) : (
                    <div className="trade-give-listing-image-placeholder">
                      <ArrowLeftRight size={22} />
                    </div>
                  )}
                </div>
                <div className="trade-give-listing-content">
                  <div className="trade-give-listing-topline">
                    <span className={`trade-give-mode-badge ${listing.mode === "give" ? "give" : "trade"}`}>
                      {listing.mode === "give" ? "GIVE" : "TRADE"}
                    </span>
                    <span className="trade-give-listing-category">{listing.category || "ITEM"}</span>
                  </div>
                  <h4>{listing.title}</h4>
                  <p>{visibleDescription}</p>
                  {needsExpansion && (
                    <button
                      type="button"
                      className="exchange-show-more trade-give-show-more"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpandedExchangeText(textKey);
                      }}
                    >
                      {expanded ? "Show less" : "Show more"}
                      <ChevronDown size={12} className={expanded ? "expanded" : ""} />
                    </button>
                  )}
                  {listing.mode === "trade" && listing.wantedItem && (
                    <span className="trade-give-wanted">Looking for: {listing.wantedItem}</span>
                  )}
                  <div className="trade-give-listing-meta">
                    <span>{listing.condition || "Good"}</span>
                    <span>{isOwner ? "Your listing" : `${listing.ownerName || "CIT Student"}`}</span>
                  </div>
                  <div className="trade-give-listing-email">
                    {listing.ownerEmail || "Email unavailable"}
                  </div>
                </div>
                <div className="trade-give-listing-arrow">›</div>
              </div>
            );
          })}
        </div>
      )}

      {tradeGiveSelectedListing && (
        <div className="trade-give-detail-overlay">
          <div className="trade-give-detail-modal">
            <div className="trade-give-detail-header">
              <div>
                <span className={`trade-give-mode-badge ${tradeGiveSelectedListing.mode === "give" ? "give" : "trade"}`}>
                  {tradeGiveSelectedListing.mode === "give" ? "GIVE AWAY" : "TRADE"}
                </span>
                <h3>{tradeGiveSelectedListing.title}</h3>
                <p>{tradeGiveSelectedListing.description}</p>
              </div>
              <button
                type="button"
                className="exchange-modal-close"
                onClick={() => setTradeGiveSelectedListing(null)}
                aria-label="Close item details"
              >
                <X size={18} />
              </button>
            </div>

            {tradeGiveSelectedListing.imageUrls?.length > 0 && (
              <div className="trade-give-detail-images">
                {tradeGiveSelectedListing.imageUrls.map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${tradeGiveSelectedListing.title} ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="trade-give-detail-info">
              <div><span>Category</span><strong>{tradeGiveSelectedListing.category || "—"}</strong></div>
              <div><span>Condition</span><strong>{tradeGiveSelectedListing.condition || "—"}</strong></div>
              <div><span>Handover</span><strong>{tradeGiveSelectedListing.handoverLocation || "CIT Campus"}</strong></div>
              <div><span>Posted by</span><strong>{tradeGiveSelectedListing.ownerName || "CIT Student"}</strong></div>
              <div><span>Email</span><strong>{tradeGiveSelectedListing.ownerEmail || "Email unavailable"}</strong></div>
            </div>

            {tradeGiveSelectedListing.mode === "trade" && (
              <div className="trade-give-wanted-panel">
                <span>Looking for</span>
                <strong>{tradeGiveSelectedListing.wantedItem || "Anything useful"}</strong>
              </div>
            )}

            {tradeGiveSelectedListing.ownerId !== authUser?.uid && tradeGiveSelectedListing.status === "active" && (
              <div className="trade-give-request-area">
                {tradeGiveRequestsLoading ? (
                  <span>Checking your request...</span>
                ) : tradeGiveRequests[0] ? (
                  <div className="trade-give-request-status">
                    <strong>Your request: {tradeGiveRequests[0].status}</strong>
                    {tradeGiveRequests[0].message && <span>{tradeGiveRequests[0].message}</span>}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="trade-give-primary-action"
                    onClick={() => setTradeGiveRequestOpen(true)}
                  >
                    {tradeGiveSelectedListing.mode === "give" ? "Claim this item" : "Request a trade"}
                  </button>
                )}
              </div>
            )}

            {tradeGiveSelectedListing.ownerId === authUser?.uid && (
              <div className="trade-give-owner-panel">
                <div className="trade-give-owner-heading">
                  <strong>Incoming requests</strong>
                  <span>{tradeGiveRequests.length}</span>
                </div>
                {tradeGiveRequestsLoading ? (
                  <span>Loading requests...</span>
                ) : tradeGiveRequests.length === 0 ? (
                  <span>No requests yet.</span>
                ) : (
                  <div className="trade-give-request-list">
                    {tradeGiveRequests.map((requestItem) => (
                      <div key={requestItem.id} className="trade-give-request-row">
                        <div>
                          <strong>{requestItem.requesterName || "CIT Student"}</strong>
                          <span>{requestItem.message || "Wants this item."}</span>
                          <small>Status: {requestItem.status}</small>
                        </div>
                        {requestItem.status === "pending" && tradeGiveSelectedListing.status === "active" && (
                          <div className="trade-give-request-actions">
                            <button type="button" onClick={() => updateTradeGiveRequest(requestItem, "accepted")}>Accept</button>
                            <button type="button" onClick={() => updateTradeGiveRequest(requestItem, "declined")}>Decline</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tradeGiveRequestOpen && tradeGiveSelectedListing && (
        <div className="trade-give-request-overlay">
          <div className="trade-give-request-modal">
            <button
              type="button"
              className="exchange-modal-close"
              onClick={() => setTradeGiveRequestOpen(false)}
              aria-label="Close request"
            >
              <X size={18} />
            </button>
            <span className={`trade-give-mode-badge ${tradeGiveSelectedListing.mode === "give" ? "give" : "trade"}`}>
              {tradeGiveSelectedListing.mode === "give" ? "FREE GIVE" : "TRADE REQUEST"}
            </span>
            <h3>{tradeGiveSelectedListing.mode === "give" ? "Claim this item" : "Request a trade"}</h3>
            <p>
              {tradeGiveSelectedListing.mode === "give"
                ? "Send the owner a short message about why you want the item."
                : `Tell ${tradeGiveSelectedListing.ownerName || "the owner"} what you can offer in return.`}
            </p>
            <textarea
              value={tradeGiveRequestText}
              onChange={(e) => setTradeGiveRequestText(e.target.value)}
              placeholder={tradeGiveSelectedListing.mode === "give" ? "Optional message..." : "What would you like to offer in return?"}
              maxLength={500}
              rows={5}
            />
            <button
              type="button"
              className="trade-give-primary-action"
              disabled={tradeGiveRequestSubmitting}
              onClick={submitTradeGiveRequest}
            >
              {tradeGiveRequestSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}

      {tradeGiveCreateOpen && (
        <div className="trade-give-create-overlay">
          <div className="trade-give-create-modal">
            <div className="trade-give-create-header">
              <div>
                <span className="community-resource-category">POST ITEM</span>
                <h3>Trade or Give</h3>
                <p>Choose whether you want something in return or want to give it away.</p>
              </div>
              <button
                type="button"
                className="exchange-modal-close"
                onClick={() => setTradeGiveCreateOpen(false)}
                aria-label="Close create listing"
              >
                <X size={18} />
              </button>
            </div>

            <div className="trade-give-mode-selector">
              <button
                type="button"
                className={tradeGiveForm.mode === "trade" ? "active" : ""}
                onClick={() => handleTradeGiveFormChange("mode", "trade")}
              >
                <ArrowLeftRight size={17} />
                <span><strong>Trade</strong><small>Receive another item in return</small></span>
              </button>
              <button
                type="button"
                className={tradeGiveForm.mode === "give" ? "active" : ""}
                onClick={() => handleTradeGiveFormChange("mode", "give")}
              >
                <ShoppingBag size={17} />
                <span><strong>Give</strong><small>Give it to another student for free</small></span>
              </button>
            </div>

            <div className="trade-give-form-grid">
              <label><span>Item title</span><input value={tradeGiveForm.title} onChange={(e) => handleTradeGiveFormChange("title", e.target.value)} placeholder="e.g. Engineering Physics Book" maxLength={120} /></label>
              <label><span>Category</span><StyledSelect value={tradeGiveForm.category} options={["Textbooks", "Project Kits", "Electronics", "Calculators", "Stationery", "Other"]} onChange={(value) => handleTradeGiveFormChange("category", value)} ariaLabel="Trade or give category" /></label>
              <label><span>Condition</span><StyledSelect value={tradeGiveForm.condition} options={["New", "Like New", "Good", "Fair", "Used"]} onChange={(value) => handleTradeGiveFormChange("condition", value)} ariaLabel="Trade or give condition" /></label>
              <label><span>Handover location</span><input value={tradeGiveForm.handoverLocation} onChange={(e) => handleTradeGiveFormChange("handoverLocation", e.target.value)} placeholder="CIT Campus" maxLength={120} /></label>
            </div>

            <label className="trade-give-full-field">
              <span>Description</span>
              <textarea value={tradeGiveForm.description} onChange={(e) => handleTradeGiveFormChange("description", e.target.value)} placeholder="Describe the item, what is included, and any defects." maxLength={1000} rows={4} />
            </label>

            {tradeGiveForm.mode === "trade" && (
              <label className="trade-give-full-field">
                <span>What are you looking for in return?</span>
                <input value={tradeGiveForm.wantedItem} onChange={(e) => handleTradeGiveFormChange("wantedItem", e.target.value)} placeholder="e.g. Arduino Uno, sensors, or another textbook" maxLength={300} />
              </label>
            )}

            <label className="trade-give-upload-field">
              <span>Item images <small>(1–6 images, max 10 MB each)</small></span>
              <input type="file" accept="image/*" multiple onChange={(e) => { handleTradeGiveFiles(e.target.files); e.target.value = ""; }} />
              <div className="marketplace-image-picker-box"><Upload size={18} /> {tradeGiveForm.files.length ? `${tradeGiveForm.files.length} image(s) selected` : "Choose item images"}</div>
            </label>

            {tradeGiveForm.files.length > 0 && (
              <div className="marketplace-selected-files">
                {tradeGiveForm.files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}
              </div>
            )}

            {tradeGiveError && <div className="marketplace-inline-error">{tradeGiveError}</div>}

            <div className="trade-give-create-actions">
              <button type="button" className="secondary-button" onClick={() => setTradeGiveCreateOpen(false)}>Cancel</button>
              <button type="button" className="primary-button" onClick={createTradeGiveListing} disabled={tradeGiveCreating}>
                {tradeGiveCreating ? "Publishing..." : "Publish Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}
  
  
{wantedOpen && (
  <div className="exchange-modal-overlay">
    <div className="exchange-modal wanted-modal">
      <div className="exchange-modal-header marketplace-modal-header">
        <div>
          <span className="community-resource-category">STUDENT EXCHANGE</span>
          <h3>Wanted / Looking For</h3>
          <p className="marketplace-modal-subtitle">
            Find something you need on campus or post a request for another student to see.
          </p>
        </div>
        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => {
            setWantedOpen(false);
            setWantedCreateOpen(false);
          }}
          aria-label="Close wanted posts"
        >
          <X size={18} />
        </button>
      </div>

      <div className="marketplace-toolbar">
        <div>
          <strong>{wantedListings.length}</strong>
          <span>active wanted posts</span>
        </div>
        <button
          type="button"
          className="marketplace-primary-button"
          onClick={() => {
            resetWantedForm();
            setWantedCreateOpen(true);
          }}
        >
          <Plus size={16} />
          Post Wanted Item
        </button>
      </div>

      {wantedError && !wantedCreateOpen && (
        <div className="marketplace-inline-error">{wantedError}</div>
      )}

      {wantedLoading ? (
        <div className="marketplace-empty-state">Loading wanted posts...</div>
      ) : wantedListings.length === 0 ? (
        <div className="marketplace-empty-state">
          <Search size={26} />
          <strong>No wanted posts yet</strong>
          <span>Be the first student to say what you are looking for.</span>
        </div>
      ) : (
        <div className="wanted-listings-grid">
          {wantedListings.map((listing) => {
            const description = listing.description || "";
            const textKey = `wanted:${listing.id}`;
            const expanded = expandedExchangeTextKeys.has(textKey);
            const needsExpansion = description.length > 150;
            const visibleDescription =
              needsExpansion && !expanded
                ? `${description.slice(0, 150).trimEnd()}…`
                : description;
            const isOwner = listing.requesterId === authUser?.uid;

            return (
              <div className="wanted-listing-card" key={listing.id}>
                {isOwner && (
                  <button
                    type="button"
                    className="exchange-listing-delete wanted-listing-delete"
                    onClick={() => deleteWantedListing(listing)}
                    aria-label={`Delete ${listing.title || "wanted post"}`}
                    title="Delete wanted post"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="wanted-listing-topline">
                  <span className="marketplace-type-badge-static">{listing.category || "OTHER"}</span>
                  <span>{listing.condition || "Any condition"}</span>
                </div>
                <h4>{listing.title}</h4>
                <p>{visibleDescription}</p>
                {needsExpansion && (
                  <button
                    type="button"
                    className="exchange-show-more"
                    onClick={() => toggleExpandedExchangeText(textKey)}
                  >
                    {expanded ? "Show less" : "Show more"}
                    <ChevronDown size={12} className={expanded ? "expanded" : ""} />
                  </button>
                )}
                <div className="wanted-listing-budget">
                  <span>Budget</span>
                  <strong>
                    {Number.isFinite(Number(listing.budget)) && Number(listing.budget) > 0
                      ? `₹${Number(listing.budget).toLocaleString("en-IN")}`
                      : "Flexible"}
                  </strong>
                </div>
                <div className="wanted-listing-owner">
                  <strong>{listing.requesterName || "CIT Student"}</strong>
                  <span>{listing.requesterEmail || "Email unavailable"}</span>
                </div>
                {listing.requesterId !== authUser?.uid && (
                  <button
                    type="button"
                    className="marketplace-enquire-button"
                    onClick={() => sendWantedEnquiry(listing)}
                  >
                    <MessageCircle size={14} />
                    I Can Help
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {wantedCreateOpen && (
        <div className="wanted-create-panel">
          <div className="wanted-create-header">
            <div>
              <span className="community-resource-category">NEW WANTED POST</span>
              <h4>What are you looking for?</h4>
            </div>
            <button
              type="button"
              className="exchange-modal-close"
              onClick={() => setWantedCreateOpen(false)}
              aria-label="Close wanted form"
            >
              <X size={16} />
            </button>
          </div>

          <div className="marketplace-form">
            <label>
              Looking for
              <input
                value={wantedForm.title}
                onChange={(e) => setWantedForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Casio FX-991ES calculator"
                maxLength={120}
              />
            </label>

            <label>
              Description
              <textarea
                value={wantedForm.description}
                onChange={(e) => setWantedForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell students what you need and any useful details."
                maxLength={500}
                rows={3}
              />
            </label>

            <div className="marketplace-form-grid">
              <label>
                Category
                <StyledSelect
                  value={wantedForm.category}
                  options={["Textbooks", "Project Kits", "Electronics", "Calculators", "Computers", "Accessories", "Sports", "Furniture", "Other"]}
                  onChange={(value) => setWantedForm((prev) => ({ ...prev, category: value }))}
                  ariaLabel="Wanted item category"
                />
              </label>
              <label>
                Condition
                <StyledSelect
                  value={wantedForm.condition}
                  options={["Any", "New", "Like New", "Good", "Fair", "For Parts"]}
                  onChange={(value) => setWantedForm((prev) => ({ ...prev, condition: value }))}
                  ariaLabel="Wanted item condition"
                />
              </label>
            </div>

            <label>
              Budget (₹) <small>optional</small>
              <input
                type="number"
                min="0"
                value={wantedForm.budget}
                onChange={(e) => setWantedForm((prev) => ({ ...prev, budget: e.target.value }))}
                placeholder="800"
              />
            </label>

            {wantedError && <div className="marketplace-inline-error">{wantedError}</div>}

            <div className="marketplace-safety-note">
              <Shield size={15} />
              <span>Your college email will be visible on the wanted post so interested students know who to contact.</span>
            </div>

            <button
              type="button"
              className="marketplace-primary-button marketplace-submit-button"
              disabled={wantedCreating}
              onClick={createWantedListing}
            >
              {wantedCreating ? "Publishing..." : "Publish Wanted Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}

{marketplaceEnquiry && (
  <div className="exchange-modal-overlay marketplace-enquiry-overlay">
    <div className="exchange-modal marketplace-enquiry-modal">
      <button
        type="button"
        className="marketplace-enquiry-close"
        onClick={closeMarketplaceEnquiry}
        aria-label="Close enquiry"
        title="Close"
      >
        <X size={16} />
      </button>

      <div className="marketplace-enquiry-icon">
        <MessageCircle size={20} />
      </div>
      <span className="eyebrow">NEW ENQUIRY</span>
      <h3>
        {marketplaceEnquiry.type === "wanted_enquiry"
          ? `${marketplaceEnquiry.helperName || marketplaceEnquiry.actorName || "CIT Student"} can help with your item`
          : `${marketplaceEnquiry.actorName || "CIT Student"} is interested in your item`}
      </h3>
      <p className="marketplace-enquiry-item">
        {marketplaceEnquiry.listingTitle || "Marketplace item"}
        {marketplaceEnquiry.type !== "wanted_enquiry" && Number(marketplaceEnquiry.listingPrice || 0) > 0 && (
          <strong>₹{Number(marketplaceEnquiry.listingPrice).toLocaleString("en-IN")}</strong>
        )}
      </p>

      <div className="marketplace-enquiry-person">
        <strong>
          {marketplaceEnquiry.type === "wanted_enquiry"
            ? (marketplaceEnquiry.helperName || marketplaceEnquiry.actorName || "CIT Student")
            : (marketplaceEnquiry.requesterName || "CIT Student")}
        </strong>
        <span>
          {marketplaceEnquiry.type === "wanted_enquiry"
            ? (marketplaceEnquiry.helperEmail || "Email unavailable")
            : (marketplaceEnquiry.requesterEmail || "Email unavailable")}
        </span>
        {((marketplaceEnquiry.type === "wanted_enquiry" && (marketplaceEnquiry.helperDepartment || marketplaceEnquiry.helperYear)) ||
          (marketplaceEnquiry.type !== "wanted_enquiry" && (marketplaceEnquiry.requesterDepartment || marketplaceEnquiry.requesterYear))) && (
          <small>
            {(marketplaceEnquiry.type === "wanted_enquiry"
              ? [marketplaceEnquiry.helperDepartment, marketplaceEnquiry.helperYear]
              : [marketplaceEnquiry.requesterDepartment, marketplaceEnquiry.requesterYear]
            )
              .filter(Boolean)
              .join(" · ")}
          </small>
        )}
      </div>

      <div className="marketplace-enquiry-tip">
        <Shield size={14} />
        <span>Quick tip: Check the requester's profile and college email before starting a conversation.</span>
      </div>

      <button
        type="button"
        className="marketplace-profile-button"
        onClick={viewMarketplaceEnquiryProfile}
      >
        <User size={14} />
        View Profile
      </button>

      <div className="marketplace-enquiry-actions">
        <button type="button" className="secondary-button" onClick={closeMarketplaceEnquiry}>
          Decline
        </button>
        <button type="button" className="primary-button" onClick={startMarketplaceEnquiryChat}>
          <MessageCircle size={14} />
          Start Chat
        </button>
      </div>
    </div>
  </div>
)}

{marketplaceDeleteTarget && (
  <div
    className="resource-delete-overlay marketplace-delete-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setMarketplaceDeleteTarget(null);
      }
    }}
  >
    <div className="resource-delete-modal marketplace-delete-modal">
      <button
        type="button"
        className="marketplace-enquiry-close"
        onClick={() => setMarketplaceDeleteTarget(null)}
        aria-label="Close delete confirmation"
        title="Close"
      >
        <X size={16} />
      </button>

      <div className="resource-delete-icon">
        <Trash2 size={24} />
      </div>
      <span className="resource-delete-eyebrow">DELETE LISTING</span>
      <h2>Delete this item?</h2>
      <p>
        This will remove <strong>{marketplaceDeleteTarget.title || "your listing"}</strong> from Buy &amp; Sell.
      </p>
      <div className="resource-delete-actions">
        <button
          type="button"
          className="resource-delete-cancel"
          onClick={() => setMarketplaceDeleteTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="resource-delete-confirm"
          onClick={confirmDeleteMarketplaceListing}
        >
          Delete Listing
        </button>
      </div>
    </div>
  </div>
)}

{wantedDeleteTarget && (
  <div
    className="resource-delete-overlay marketplace-delete-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setWantedDeleteTarget(null);
      }
    }}
  >
    <div className="resource-delete-modal marketplace-delete-modal">
      <button
        type="button"
        className="marketplace-enquiry-close"
        onClick={() => setWantedDeleteTarget(null)}
        aria-label="Close delete confirmation"
        title="Close"
      >
        <X size={16} />
      </button>

      <div className="resource-delete-icon">
        <Trash2 size={24} />
      </div>
      <span className="resource-delete-eyebrow">DELETE WANTED POST</span>
      <h2>Delete this wanted post?</h2>
      <p>
        This will remove <strong>{wantedDeleteTarget.title || "your wanted post"}</strong> from Wanted / Looking For.
      </p>
      <div className="resource-delete-actions">
        <button
          type="button"
          className="resource-delete-cancel"
          onClick={() => setWantedDeleteTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="resource-delete-confirm"
          onClick={confirmDeleteWantedListing}
        >
          Delete Post
        </button>
      </div>
    </div>
  </div>
)}

{tradeGiveDeleteTarget && (
  <div
    className="resource-delete-overlay marketplace-delete-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setTradeGiveDeleteTarget(null);
      }
    }}
  >
    <div className="resource-delete-modal marketplace-delete-modal">
      <button
        type="button"
        className="marketplace-enquiry-close"
        onClick={() => setTradeGiveDeleteTarget(null)}
        aria-label="Close delete confirmation"
        title="Close"
      >
        <X size={16} />
      </button>

      <div className="resource-delete-icon">
        <Trash2 size={24} />
      </div>
      <span className="resource-delete-eyebrow">DELETE TRADE / GIVE LISTING</span>
      <h2>Delete this listing?</h2>
      <p>
        This will remove <strong>{tradeGiveDeleteTarget.title || "your listing"}</strong> from Trade or Give.
      </p>
      <div className="resource-delete-actions">
        <button
          type="button"
          className="resource-delete-cancel"
          onClick={() => setTradeGiveDeleteTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="resource-delete-confirm"
          onClick={confirmDeleteTradeGiveListing}
        >
          Delete Listing
        </button>
      </div>
    </div>
  </div>
)}

{editProfileOpen && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal edit-profile-modal">

      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => setEditProfileOpen(false)}
        aria-label="Close edit profile"
      >
        <X size={18} />
      </button>

      <div className="hackathon-modal-icon">
        <User size={28} />
      </div>

      <span className="eyebrow">
        PROFILE SETTINGS
      </span>

      <h2>
        Edit Profile
      </h2>

      <p className="hackathon-modal-description">
        Update your CampusConnect profile information.
      </p>

      <form
onSubmit={async (e) => {
  e.preventDefault();

  if (!authUser) {
    return;
  }

  const form = e.currentTarget;
  const formData = new FormData(form);

  const identity = getCITEmailIdentity(authUser.email);
  const lockedNameSequence = profileData.lockedNameSequence || identity?.nameSequence || "";
  const lockedDepartment = identity?.department || normalizeDepartment(profileData.department || "");
  const lockedYear = getAcademicYearLabelFromBatch(identity?.batchYear) || profileData.year || "";
  const batchYear = identity?.batchYear || profileData.batchYear || "";
  const rawName = formData.get("name")?.toString() || "";
  const nameValidation = validateLockedNameFormat(rawName, lockedNameSequence);

  if (!nameValidation.valid) {
    setProfileNameError(nameValidation.message);
    return;
  }

  const updatedProfile = {
    name: nameValidation.canonical,
    college: CAMPUSCONNECT_COLLEGE,
    department: lockedDepartment,
    batchYear,
    // Keep the legacy academic-year label for existing marketplace/team features.
    year: getAcademicYearLabelFromBatch(batchYear) || lockedYear,
    bio: formData.get("bio")?.toString().trim() || "",
    skills: formData.get("skills")?.toString().trim() || "",
    email: authUser.email || "",
    campusConnectId: profileData.campusConnectId || "",
    lockedNameSequence,
    identityProfileVersion: IDENTITY_PROFILE_VERSION,
    identitySetupCompleted: true,
  };

  try {
    await setDoc(
      doc(db, "users", authUser.uid),
      updatedProfile,
      { merge: true }
    );

    // Keep the owner name stored on existing teams in sync with the
    // student's current profile name. The profile is the source of truth.
    try {
      const ownedTeamsSnapshot = await withTimeout(
        getDocs(
          query(
            collection(db, "teams"),
            where("createdBy", "==", authUser.uid)
          )
        ),
        10000,
        "Owned team profile sync"
      );

      if (!ownedTeamsSnapshot.empty) {
        const syncBatch = writeBatch(db);
        ownedTeamsSnapshot.docs.forEach((teamDoc) => {
          syncBatch.update(teamDoc.ref, {
            createdByName: updatedProfile.name || authUser.email || "CIT Student",
          });
        });
        await syncBatch.commit();

        setAllTeams((prev) =>
          prev.map((team) =>
            team.createdBy === authUser.uid
              ? {
                  ...team,
                  createdByName:
                    updatedProfile.name || authUser.email || "CIT Student",
                }
              : team
          )
        );

        setUserTeams((prev) =>
          prev.map((team) =>
            team.createdBy === authUser.uid
              ? {
                  ...team,
                  createdByName:
                    updatedProfile.name || authUser.email || "CIT Student",
                }
              : team
          )
        );
      }
    } catch (teamNameSyncError) {
      // Profile update should still succeed even if an old team's cached
      // owner name cannot be synchronized. The UI uses profileData first.
      console.error(
        "TEAM OWNER NAME SYNC ERROR:",
        teamNameSyncError
      );
    }

    setProfileData(updatedProfile);
    setProfileNameDraft(updatedProfile.name);
    setProfileNameError("");

    setEditProfileOpen(false);

    showActionToast(
      "Profile updated successfully!"
    );
  } catch (error) {
    console.error(
      "PROFILE UPDATE ERROR:",
      error
    );

    showActionToast(
      "Unable to update your profile."
    );
  }
}}>

<label>
  Full Name
  <input
    type="text"
    name="name"
    value={profileNameDraft}
    onChange={(event) => {
      const nextValue = event.target.value;
      const identity = getCITEmailIdentity(authUser?.email);
      const lockedSequence =
        profileData.lockedNameSequence || identity?.nameSequence || "";

      if (!lockedSequence) {
        return;
      }

      // The letters are immutable. The only editable characters are spaces.
      // Backspace/Delete can therefore remove spaces, while typed/pasted
      // letters that would alter the email-derived sequence are rejected.
      const spaces = (nextValue.match(/ /g) || []).length;
      const compacted = nextValue.replace(/ /g, "").toLowerCase();

      if (!/^[A-Za-z ]*$/.test(nextValue)) return;
      if (spaces > 3) return;
      if (/^ | $| {2,}/.test(nextValue)) return;
      if (compacted !== lockedSequence.toLowerCase()) return;

      setProfileNameDraft(formatLockedName(nextValue));
      setProfileNameError("");
    }}
    onBlur={() => setProfileNameDraft(formatLockedName(profileNameDraft))}
    required
    autoComplete="name"
    spellCheck="false"
    aria-describedby="locked-name-hint"
  />
  <span className="profile-locked-hint" id="locked-name-hint">
    Letters are locked to your CIT email. You may insert up to 3 spaces for formatting.
  </span>
  {profileNameError && <span className="profile-field-error">{profileNameError}</span>}
</label>

<label>
  College
  <input
    type="text"
    value={CAMPUSCONNECT_COLLEGE}
    readOnly
    aria-readonly="true"
    className="profile-readonly-input"
  />
</label>

<label>
  College Email
  <input
    type="email"
    value={authUser?.email || ""}
    readOnly
    aria-readonly="true"
    className="profile-readonly-input"
  />
</label>

<label>
  Department
  <input
    type="text"
    value={normalizeDepartment(profileData.department) || "Not detected"}
    readOnly
    aria-readonly="true"
    className="profile-readonly-input"
  />
</label>

<label>
  Batch
  <input
    type="text"
    name="batchYear"
    value={getCITEmailIdentity(authUser?.email)?.batchYear || profileData.batchYear || ""}
    readOnly
    aria-readonly="true"
    className="profile-readonly-input"
    aria-describedby="batch-year-hint"
  />
  <span className="profile-locked-hint" id="batch-year-hint">
    Automatically derived from your CIT email and cannot be edited.
  </span>
</label>

<label>
  Bio
  <textarea
    name="bio"
    defaultValue={profileData.bio}
    rows="4"
    required
  />
</label>

<label>
  Skills
  <input
    type="text"
    name="skills"
    defaultValue={profileData.skills}
    placeholder="React, Python, UI/UX..."
    required
  />
</label>

        <button
          type="submit"
          className="primary-button"
        >
          Save Changes
        </button>

      </form>

    </div>
  </div>
)}

{selectedMedia && (
  <div
    className="profile-media-viewer-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setSelectedMedia(null);
      }
    }}
  >
    <div className="profile-media-viewer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="profile-media-viewer-close"
        onClick={() => setSelectedMedia(null)}
        aria-label="Close media viewer"
      >
        <X size={18} />
      </button>

      <div className="profile-media-viewer-content">
        {selectedMedia.type === "pdf" || selectedMedia.mimeType === "application/pdf" ? (
          <iframe
            src={selectedMedia.url}
            title={selectedMedia.title || selectedMedia.fileName || "PDF preview"}
          />
        ) : (
          <img
            src={selectedMedia.url}
            alt={selectedMedia.title || selectedMedia.fileName || "Achievement media"}
          />
        )}
      </div>

      <div className="profile-media-viewer-footer">
        <div>
          <strong>{selectedMedia.title || selectedMedia.fileName || "Achievement media"}</strong>
          <span>{selectedMedia.mimeType || "Media"}</span>
        </div>

        {viewingOwnProfile && (
          <button
            type="button"
            className="profile-media-delete-button"
            onClick={() => deleteProfileMedia(selectedMedia)}
          >
            <Trash2 size={15} />
            Remove
          </button>
        )}
      </div>
    </div>
  </div>
)}

{mediaGalleryOpen && (
  <div
    className="profile-media-gallery-overlay"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        setMediaGalleryOpen(false);
      }
    }}
  >
    <div className="profile-media-gallery-modal" role="dialog" aria-modal="true">
      <div className="profile-media-gallery-header">
        <div>
          <span className="eyebrow">ACHIEVEMENTS & MEDIA</span>
          <h3>Full Gallery</h3>
        </div>
        <button
          type="button"
          className="profile-media-viewer-close"
          onClick={() => setMediaGalleryOpen(false)}
          aria-label="Close gallery"
        >
          <X size={18} />
        </button>
      </div>

      <div className="profile-media-gallery-grid">
        {profileMedia.map((media) => {
          const isPdf = media.type === "pdf" || media.mimeType === "application/pdf";
          return (
            <button
              type="button"
              className="profile-media-gallery-item"
              key={media.id}
              onClick={() => {
                setMediaGalleryOpen(false);
                setSelectedMedia(media);
              }}
            >
              {isPdf ? (
                <div className="profile-media-pdf-preview">
                  <FileImage size={30} />
                  <span>PDF</span>
                </div>
              ) : (
                <img
                  src={media.thumbnailUrl || media.url}
                  alt={media.title || media.fileName || "Achievement media"}
                  loading="lazy"
                />
              )}
              <span>{media.title || media.fileName || "Achievement media"}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
)}

{/* ================= PROFILE ================= */}

{/* FOOTER */}

          <footer>

            <div className="footer-brand">
              <div className="brand-mark">
                <Rocket size={17} />
              </div>

              <strong>
                CampusConnect
              </strong>
            </div>

            <span>
              Connecting students. Building ideas.
            </span>

            <span>
              © 2026 CampusConnect
            </span>

          </footer>

           </div>

    {/* ================= HACKATHON DETAILS POPUP ================= */}

    {selectedHackathon && (
      
      <div className="hackathon-modal-overlay competition-modal-overlay">
        <div className="hackathon-modal hackathon-competition-modal">

          <button
            className="hackathon-modal-close"
            onClick={() => setSelectedHackathon(null)}
          >
            ✕
          </button>

          <div className="hackathon-modal-icon">
            <Trophy size={28} />
          </div>

          <span className="eyebrow">
            HACKATHON
          </span>

          <h2>
            {selectedHackathon.name}
          </h2>

          <p className="hackathon-modal-date">
            📅 {selectedHackathon.date}
          </p>

          {(() => {
            const overviewText = normalizeSheetText(selectedHackathon.detailOverview);
            const overviewSourceUrl = normalizeOfficialUrl(selectedHackathon.overviewSourceUrl || (overviewText ? getKnownCompetitionOverviewSource(selectedHackathon) : ""));
            const maxPreviewLength = 520;
            const needsExpansion = overviewText.length > maxPreviewLength;
            const visibleOverview = needsExpansion && !hackathonDetailsExpanded
              ? `${overviewText.slice(0, maxPreviewLength).trim()}…`
              : overviewText;

            return (
              <div className="opportunity-overview">
                <span className="opportunity-overview-label">CHALLENGE OVERVIEW</span>
                {overviewText ? (
                  <p style={{ whiteSpace: "pre-line" }}>{visibleOverview}</p>
                ) : (
                  <p>No additional challenge overview is available from a verified public source.</p>
                )}

                {overviewSourceUrl && (
                  <a href={overviewSourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", fontWeight: 700, opacity: 0.78 }}>
                    {selectedHackathon.overviewSourceLabel || "Official source"}
                    <ExternalLink size={11} style={{ marginLeft: "4px", verticalAlign: "-2px" }} />
                  </a>
                )}

                {needsExpansion && (
                  <div style={{ marginTop: "10px" }}>
                    <button type="button" className="secondary-button" onClick={() => setHackathonDetailsExpanded((prev) => !prev)}>
                      {hackathonDetailsExpanded ? "Show less" : "Show more"}
                    </button>
                  </div>
                )}

                {selectedHackathon.detailThemes?.filter(isRealOpportunityValue).length > 0 && (
                  <div className="opportunity-themes">
                    <span>KEY THEMES</span>
                    <ul>
                      {selectedHackathon.detailThemes.filter(isRealOpportunityValue).map((theme, index) => (
                        <li key={`${selectedHackathon.id}-theme-${index}`}>{theme}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="opportunity-detail-grid">
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Registration deadline</span><strong style={DETAIL_TILE_VALUE_STYLE}>{formatOpportunityDate(selectedHackathon.registrationDeadline)}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Eligible year</span><strong style={DETAIL_TILE_VALUE_STYLE}>{selectedHackathon.eligibleYear || "See official source"}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Category</span><strong style={DETAIL_TILE_VALUE_STYLE}>{selectedHackathon.category || "Competition"}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Organizer</span><strong style={DETAIL_TILE_VALUE_STYLE}>{selectedHackathon.organizer || "See official source"}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Prize</span><strong style={DETAIL_TILE_VALUE_STYLE}>{selectedHackathon.prizeAmount || "See official source"}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Registration</span><strong style={DETAIL_TILE_VALUE_STYLE}>{!selectedHackathon.activeForRegistration ? "Registration Closed" : selectedHackathon.daysRemaining === 0 ? "Closes today" : `${selectedHackathon.daysRemaining ?? "—"} day(s) left`}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Team size</span><strong style={DETAIL_TILE_VALUE_STYLE}>{selectedHackathon.teamSize || "Not specified in source"}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Round 1</span><strong style={DETAIL_TILE_VALUE_STYLE}>{formatOpportunityDate(selectedHackathon.round1Date)}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Round 2</span><strong style={DETAIL_TILE_VALUE_STYLE}>{formatOpportunityDate(selectedHackathon.round2Date)}</strong></div>
            <div style={DETAIL_TILE_STYLE}><span style={DETAIL_TILE_LABEL_STYLE}>Final / event</span><strong style={DETAIL_TILE_VALUE_STYLE}>{formatOpportunityDate(selectedHackathon.competitionDate)}</strong></div>
          </div>

  <div
    className="hackathon-modal-actions"
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      transform: "translateX(12px)"
    }}
  >
  <button
    type="button"
    className="secondary-button"
    onClick={() => {
      setSelectedHackathon(null);
      setSearchCategory("students");
      setSearchText("");
      setTeammateDepartmentFilter("");
      setTeammateYearFilter("");
      setTeammateSkillFilter("");
      setSearchOpen(true);
    }}
  >
    <Users size={17} />
    Find Teammates
  </button>
  {getOpportunityOfficialUrl(selectedHackathon) && (
    <a
      className="primary-button official-opportunity-button"
      href={getOpportunityOfficialUrl(selectedHackathon)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink size={16} />
      Source Website
    </a>
  )}
  <a
    className="secondary-button official-opportunity-button"
    href={getOpportunityDashboardUrl(selectedHackathon)}
    target="_blank"
    rel="noopener noreferrer"
  >
    <ExternalLink size={16} />
    Source Dashboard
  </a>
</div>
<p className="hackathon-modal-description" style={{ marginTop: "12px", fontSize: "10px" }}>
  Registration is handled by the organizer. CampusConnect calculates active registration from the source deadline and status.
</p>

        </div>
      </div>
    )}
      

      {/* ================= REGISTRATION FORM ================= */}

      {registrationOpen && (
        <div className="hackathon-modal-overlay">
          <div className="hackathon-modal">

            <button
              className="hackathon-modal-close"
              onClick={() => setRegistrationOpen(false)}
            >
              X
            </button>

            <span className="eyebrow">
              REGISTRATION
            </span>

            <h2>
              Register for {selectedHackathon?.name}
            </h2>

            <form
             onSubmit={async (e) => {
                e.preventDefault();

                if (!authUser || !selectedHackathon) {
                  showActionToast("Please sign in before registering.");
                  return;
                }

                if (registeredHackathonIds.includes(selectedHackathon.id)) {
                  showActionToast("You are already registered for this hackathon.");
                  setRegistrationOpen(false);
                  return;
                }

                const form = e.currentTarget;
                const formData = new FormData(form);

                const fullName = formData.get("fullName")?.toString().trim();
                const email = formData.get("email")?.toString().trim().toLowerCase();
                const college = formData.get("college")?.toString().trim();
                const phone = formData.get("phone")?.toString().trim();
                const skills = formData.get("skills")?.toString().trim();

                if (!fullName || !email || !college || !phone || !skills) {
                  showActionToast("Please complete all registration fields.");
                  return;
                }

                try {
                  setRegistrationSubmitting(true);

                  const registrationRef = doc(
                    db,
                    "hackathonRegistrations",
                    `${authUser.uid}_${selectedHackathon.id}`
                  );

                  // Check for an existing registration using a query.
                  // This avoids reading a missing document directly, which
                  // can be denied by Firestore rules that inspect resource.data.
                  const existingRegistrationsSnapshot = await getDocs(
                    query(
                      collection(db, "hackathonRegistrations"),
                      where("userId", "==", authUser.uid),
                      where("hackathonId", "==", selectedHackathon.id)
                    )
                  );

                  if (!existingRegistrationsSnapshot.empty) {
                    setRegisteredHackathonIds((prev) =>
                      prev.includes(selectedHackathon.id)
                        ? prev
                        : [...prev, selectedHackathon.id]
                    );
                    showActionToast(
                      "You are already registered for this hackathon."
                    );
                    setRegistrationOpen(false);
                    return;
                  }

                  await setDoc(registrationRef, {
                    userId: authUser.uid,
                    userName: fullName,
                    email,
                    college,
                    phone,
                    skills,
                    hackathonId: selectedHackathon.id,
                    hackathonName: selectedHackathon.name,
                    registeredAt: serverTimestamp(),
                    status: "registered",
                  });

                  await setDoc(
                    doc(db, "users", authUser.uid),
                    {
                      hackathonsJoined: increment(1),
                    },
                    { merge: true }
                  );

                  setRegisteredHackathonIds((prev) => [
                    ...prev,
                    selectedHackathon.id,
                  ]);

                  setActivityData((prev) => ({
                    ...prev,
                    hackathonsJoined: prev.hackathonsJoined + 1,
                  }));

                  showActionToast(
                    `Registered for ${selectedHackathon.name} successfully!`
                  );
                  setRegistrationOpen(false);
                  form.reset();
                } catch (error) {
                  console.error(
                    "HACKATHON REGISTRATION ERROR:",
                    error
                  );

                  showActionToast(
                    "Unable to complete registration. Please try again."
                  );
                } finally {
                  setRegistrationSubmitting(false);
                }
              }}
            >

              {/* Profile details are prefilled; email comes from Firebase Auth. Phone remains editable until it is added to the user profile. */}
              <label>
                Full Name
                <input
  type="text"
  name="fullName"
  placeholder="Enter your full name"
  pattern="[A-Za-z ]{3,}"
  minLength={3}
  defaultValue={profileData.name || authUser?.displayName || ""}
  required
/>
              </label>

              <label>
                Email
<input
  type="email"
  name="email"
  placeholder="Email address"
  defaultValue={authUser?.email || ""}
  readOnly
  required
/>
              </label>

              <label>
                College / University
                <input
  type="text"
  name="college"
  placeholder="Enter your college"
  minLength={3}
  defaultValue={profileData.college || ""}
  required
/>
              </label>

              <label>
                Phone Number
                <input
  type="tel"
  name="phone"
  placeholder="Enter your 10-digit phone number"
  pattern="[0-9]{10}"
  maxLength={10}
  defaultValue={profileData.phone || ""}
  required
/>
              </label>

              <label>
                Skills
                <input
  type="text"
  name="skills"
  placeholder="e.g. React, Python, AI"
  minLength={2}
  defaultValue={profileData.skills || ""}
  required
/>
              </label>

              <button
                type="submit"
                className="primary-button"
                disabled={registrationSubmitting}
              >
                {registrationSubmitting
                  ? "Submitting..."
                  : "Submit Registration"}
              </button>

            </form>

          </div>
        </div>
           )}

      {/* ================= SHARE RESOURCE POPUP ================= */}

      {shareResourceOpen && (
        <div className="hackathon-modal-overlay">
          <div className="hackathon-modal share-resource-modal">

            <button
              className="hackathon-modal-close"
              onClick={() => {
                setShareResourceOpen(false);
                setShareResourceCategory("");
                setShareResourceImageFile(null);
              }}
            >
              ×
            </button>

            <div className="hackathon-modal-icon">
              <BookOpen size={28} />
            </div>

            <span className="eyebrow">
              COMMUNITY RESOURCES
            </span>

            <h2>
              Share a Community Resource
            </h2>

            <p className="hackathon-modal-description">
              Share something useful with students across campus.
            </p>

            <form
  onSubmit={async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const formData = new FormData(form);

  const title = formData.get("title")?.toString().trim();
  const category = formData.get("category");
  const description = formData.get("description")?.toString().trim();
  const link = formData.get("link")?.toString().trim();

  if (!title || !category || !description || !link) {
    return;
  }

  if (!authUser || !isCollegeEmail(authUser.email)) {
    showActionToast("Only verified CIT accounts can share resources.");
    return;
  }

  if (title.length > 120 || description.length > 1000) {
    showActionToast("Please shorten the title or description.");
    return;
  }

  try {
    setShareResourceUploading(Boolean(shareResourceImageFile));

    const uploadedCover = shareResourceImageFile
      ? await uploadShareResourceImage(shareResourceImageFile)
      : null;

    const newResource = {
      title,
      category,
      description,
      link,
      userId: authUser.uid,
      userName:
        profileData.name ||
        authUser.displayName ||
        authUser.email?.split("@")[0] ||
        "CIT Student",
      userEmail: authUser.email || "",
      userDepartment: profileData.department || "",
      userYear: profileData.year || "",
      coverImageUrl: uploadedCover?.url || "",
      coverImageThumbnailUrl: uploadedCover?.thumbnailUrl || "",
      coverImageFileId: uploadedCover?.fileId || "",
      coverImageFileName: uploadedCover?.fileName || "",
      createdAt: serverTimestamp(),
    };

    const resourceRef = await addDoc(
      collection(db, "communityResources"),
      newResource
    );

    setCommunityResources((prev) => [
      ...prev,
      { id: resourceRef.id, ...newResource, createdAt: new Date() },
    ]);

    try {
      await setDoc(
        doc(db, "users", authUser.uid),
        {
          resourcesShared: increment(1),
        },
        { merge: true }
      );
    } catch (activityError) {
      console.error("RESOURCE ACTIVITY UPDATE ERROR:", activityError);
    }
  } catch (error) {
    console.error("RESOURCE SHARE ERROR:", error);
    showActionToast("Unable to share the resource right now.");
    return;
  } finally {
    setShareResourceUploading(false);
  }

  setShareResourceImageFile(null);

  setActivityData((prev) => ({
    ...prev,
    resourcesShared: prev.resourcesShared + 1,
  }));

  setShareResourceOpen(false);
  setShareResourceCategory("");
  setShowSharedResources(true);
  setCommunityFilter(category);
  setCommunitySearch("");
  setShareSuccess(true);

  form.reset();

  setTimeout(() => {
    setShareSuccess(false);
  }, 3000);
}}
>

              <label>
                Resource Title
<input
  type="text"
  name="title"
  placeholder="Enter resource title"
  required
/>
              </label>

              <label>
                Category
                <StyledSelect
                  name="category"
                  value={shareResourceCategory}
                  options={["Question Papers", "Hackathon Resources", "Projects & References"]}
                  onChange={setShareResourceCategory}
                  ariaLabel="Select resource category"
                  placeholder="Select a category"
                  required
                />
              </label>

              <label>
                Description
                <textarea
  name="description"
  placeholder="Describe what you are sharing..."
  rows="4"
  required
/>
              </label>

              <label className="community-resource-image-picker">
                Cover Image <small>(optional · 1 image · max 3 MB · JPG, PNG, WebP)</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    handleShareResourceImage(e.target.files);
                    e.target.value = "";
                  }}
                  disabled={shareResourceUploading}
                />
                <div className="community-resource-image-picker-box">
                  <FileImage size={16} />
                  {shareResourceImageFile ? shareResourceImageFile.name : "Choose cover image"}
                </div>
              </label>

              <label>
                Resource / Link
<input
  type="url"
  name="link"
  placeholder="Paste a resource link"
  required
/>
              </label>

              <button
                type="submit"
                className="primary-button"
                disabled={shareResourceUploading}
              >
                {shareResourceUploading
                  ? "Uploading..."
                  : shareSuccess
                    ? "Shared Successfully!"
                    : "Share Resource"}
              </button>

            </form>

          </div>
        </div>
      )}


      {/* ================= ONE-TIME CIT IDENTITY SETUP ================= */}
      {identitySetupOpen && authUser && (
        <div
          className="hackathon-modal-overlay identity-setup-overlay"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="hackathon-modal identity-setup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-setup-title"
          >
            <div className="hackathon-modal-icon">
              <Shield size={28} />
            </div>
            <span className="eyebrow">ONE-TIME PROFILE SETUP</span>
            <h2 id="identity-setup-title">Confirm your CampusConnect name</h2>
            <p className="hackathon-modal-description">
              Your CIT email determines your name, department, and academic batch. You may only insert spaces into the email-derived name sequence for a clean display name.
            </p>

            <div className="identity-setup-source-card">
              <div><span>College Email</span><strong>{authUser.email}</strong></div>
              <div><span>Department</span><strong>{profileData.department || "Not detected"}</strong></div>
              <div><span>Batch</span><strong>{profileData.batchYear || getCITEmailIdentity(authUser?.email)?.batchYear || "Not detected"}</strong></div>
            </div>

            <label className="identity-setup-name-label">
              <span>Display Name</span>
              <input
                type="text"
                name="campusconnectDisplayName"
                value={identityNameDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const identity = getCITEmailIdentity(authUser.email);
                  const lockedSequence =
                    identity?.nameSequence || profileData.lockedNameSequence || "";

                  if (!lockedSequence) {
                    setIdentitySetupError("Your CIT email could not be used to determine the official name format.");
                    return;
                  }

                  if (!/^[A-Za-z ]*$/.test(nextValue)) {
                    setIdentitySetupError("Only letters and spaces are allowed.");
                    return;
                  }

                  const spaces = (nextValue.match(/ /g) || []).length;
                  if (spaces > 3) {
                    setIdentitySetupError("You can insert a maximum of 3 spaces.");
                    return;
                  }

                  if (/^ | $| {2,}/.test(nextValue)) {
                    setIdentitySetupError("Use single spaces between name parts only.");
                    return;
                  }

                  const compacted = nextValue.replace(/ /g, "").toLowerCase();
                  if (compacted !== lockedSequence.toLowerCase()) {
                    setIdentitySetupError("Only spaces may be inserted. The letters and their order must match your CIT email.");
                    return;
                  }

                  setIdentityNameDraft(formatLockedName(nextValue));
                  setIdentitySetupError("");
                }}
                onBlur={() => setIdentityNameDraft(formatLockedName(identityNameDraft))}
                autoFocus
                autoComplete="new-password"
                data-form-type="other"
                data-lpignore="true"
                spellCheck="false"
                aria-describedby="identity-setup-name-hint"
              />
              <small id="identity-setup-name-hint">Maximum 3 spaces. Letters and their order must stay exactly as derived from your CIT email.</small>
            </label>

            {identitySetupError && <div className="auth-error-message">⚠ {identitySetupError}</div>}

            <button
              type="button"
              className="primary-button identity-setup-save"
              disabled={identitySetupSaving}
              onClick={async () => {
                const identity = getCITEmailIdentity(authUser.email);
                const lockedNameSequence = identity?.nameSequence || profileData.lockedNameSequence || "";
                const validation = validateLockedNameFormat(identityNameDraft, lockedNameSequence);
                if (!validation.valid) {
                  setIdentitySetupError(validation.message);
                  return;
                }

                const derivedDepartment = identity?.department || profileData.department || "";
                const derivedBatchYear = identity?.batchYear || profileData.batchYear || "";
                const derivedYear = getAcademicYearLabelFromBatch(identity?.batchYear) || profileData.year || "";
                setIdentitySetupSaving(true);
                setIdentitySetupError("");

                try {
                  await setDoc(
                    doc(db, "users", authUser.uid),
                    {
                      name: validation.canonical,
                      college: CAMPUSCONNECT_COLLEGE,
                      department: derivedDepartment,
                      batchYear: derivedBatchYear,
                      year: derivedYear,
                      email: authUser.email || "",
                      lockedNameSequence,
                      identityProfileVersion: IDENTITY_PROFILE_VERSION,
                      identitySetupCompleted: true,
                    },
                    { merge: true }
                  );

                  setProfileData((previous) => ({
                    ...previous,
                    name: validation.canonical,
                    college: CAMPUSCONNECT_COLLEGE,
                    department: normalizeDepartment(derivedDepartment),
                    batchYear: derivedBatchYear,
                    year: derivedYear,
                    email: authUser.email || "",
                    lockedNameSequence,
                    identityProfileVersion: IDENTITY_PROFILE_VERSION,
                    identitySetupCompleted: true,
                  }));

                  setIdentityNameDraft(validation.canonical);
                  setIdentitySetupOpen(false);
                  if (identityWelcomePendingRef.current) {
                    identityWelcomePendingRef.current = false;
                    setWelcomeOpen(true);
                  }
                } catch (error) {
                  console.error("IDENTITY SETUP SAVE ERROR:", error);
                  setIdentitySetupError("Unable to save your profile identity right now. Please try again.");
                } finally {
                  setIdentitySetupSaving(false);
                }
              }}
            >
              {identitySetupSaving ? "Saving..." : "Continue to CampusConnect"}
            </button>
          </div>
        </div>
      )}

      {/* ================= FEEDBACK & SUPPORT ================= */}
      {feedbackSupportOpen && (
        <div
          className="hackathon-modal-overlay feedback-support-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setFeedbackSupportOpen(false);
          }}
        >
          <div
            className="hackathon-modal feedback-support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-support-title"
          >
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={() => setFeedbackSupportOpen(false)}
              aria-label="Close Feedback & Support"
            >
              <X size={18} />
            </button>

            <div className="feedback-support-icon"><CircleHelp size={26} /></div>
            <span className="eyebrow">CAMPUSCONNECT SUPPORT</span>
            <h2 id="feedback-support-title">Feedback &amp; Support</h2>

            <div className="feedback-support-developer-note">
              <p>CampusConnect is built to help students connect, collaborate, share resources, and discover opportunities.</p>
              <p>We're constantly improving, so if you spot a bug or have an idea, we'd love to hear it. Please also help keep this space safe by not sharing misleading links or anything harmful.</p>
              <p><strong>Thank you, and happy connecting! 🎓</strong></p>
              <p><em>— CampusConnect Developer</em></p>
            </div>

            <div className="feedback-support-services">
              <a
                className="feedback-support-service"
                href={getDeveloperMailtoUrl("[CampusConnect] Bug Report")}
                onClick={(event) =>
                  handleDeveloperEmailClick(
                    event,
                    "[CampusConnect] Bug Report"
                  )
                }
                aria-label="Report a Bug"
              >
                <span className="feedback-support-service-icon">🐞</span>
                <span><strong>Report a Bug</strong><small>Something not working? Let us know.</small></span>
                <Mail size={16} />
              </a>
              <a
                className="feedback-support-service"
                href={getDeveloperMailtoUrl("[CampusConnect] Improvement Suggestion")}
                onClick={(event) =>
                  handleDeveloperEmailClick(
                    event,
                    "[CampusConnect] Improvement Suggestion"
                  )
                }
                aria-label="Suggest an Improvement"
              >
                <span className="feedback-support-service-icon">💡</span>
                <span><strong>Suggest an Improvement</strong><small>Got an idea to make CampusConnect better? Share it with us.</small></span>
                <Mail size={16} />
              </a>
              <a
                className="feedback-support-service"
                href={getDeveloperMailtoUrl("[CampusConnect] Developer Contact")}
                onClick={(event) =>
                  handleDeveloperEmailClick(
                    event,
                    "[CampusConnect] Developer Contact"
                  )
                }
                aria-label="Contact Developer"
              >
                <span className="feedback-support-service-icon">✉️</span>
                <span><strong>Contact Developer</strong><small>Questions or anything else? Send a direct message.</small></span>
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================= FIRST-TIME WELCOME MODAL ================= */}
      {welcomeOpen && authUser && (
        <div
          className="hackathon-modal-overlay welcome-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !welcomeSaving) {
              dismissWelcome();
            }
          }}
        >
          <div
            className="hackathon-modal welcome-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campusconnect-welcome-title"
          >
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={dismissWelcome}
              disabled={welcomeSaving}
              aria-label="Close welcome message"
            >
              <X size={18} />
            </button>

            <div className="welcome-modal-icon">
              <Rocket size={26} />
            </div>

            <span className="eyebrow">WELCOME TO CAMPUSCONNECT</span>
            <h2 id="campusconnect-welcome-title">Hey, {profileData.name || authUser.displayName || authUser.email?.split("@")[0] || "CIT Student"}! 👋</h2>
            <p className="welcome-modal-lead">Your campus, all in one place.</p>
            <p className="hackathon-modal-description welcome-modal-description">
              Connect with students, build teams, share resources, discover opportunities, and exchange useful items around campus.
            </p>

            <div className="welcome-modal-guides">
              <div className="welcome-modal-guide">
                <div className="welcome-modal-guide-icon"><Bell size={16} /></div>
                <div>
                  <strong>Stay updated</strong>
                  <span>Check your notifications regularly for connection requests, help requests, and exchange updates.</span>
                </div>
              </div>

              <div className="welcome-modal-guide">
                <div className="welcome-modal-guide-icon"><User size={16} /></div>
                <div>
                  <strong>Complete your profile</strong>
                  <span>Add your skills and interests so students can connect with you more easily.</span>
                </div>
              </div>

              <div className="welcome-modal-guide">
                <div className="welcome-modal-guide-icon"><Shield size={16} /></div>
                <div>
                  <strong>Share responsibly</strong>
                  <span>Never share passwords, OTPs, financial details, private documents, or other sensitive information. Avoid unnecessary or misleading photos and videos.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button welcome-get-started"
              onClick={dismissWelcome}
              disabled={welcomeSaving}
            >
              {welcomeSaving ? "Saving..." : "Get Started →"}
            </button>
          </div>
        </div>
      )}

      {/* ================= TEAM PREVIEW POPUP ================= */}
      {selectedTeamPreview && (
        <div
          className="hackathon-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTeamPreview();
          }}
        >
          <div className="hackathon-modal team-status-modal team-preview-modal team-preview-modal-shell">
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={closeTeamPreview}
              aria-label="Close team preview"
            >
              <X size={18} />
            </button>

            <div className="hackathon-modal-icon">
              <Rocket size={28} />
            </div>
            <span className="eyebrow">TEAM PREVIEW</span>
            <h2>{selectedTeamPreview.title || "Hackathon Team"}</h2>
            <p className="hackathon-modal-description">
              {selectedTeamPreview.idea || "No project description has been added yet."}
            </p>

            {teamPreviewLoading ? (
              <div className="team-status-loading">Loading team details...</div>
            ) : (
              <>
                <div className="team-status-section">
                  <div className="team-status-section-title">Team Leader</div>
                  <div className="team-status-member team-preview-leader-row">
                    <div className="team-status-member-avatar"><User size={15} /></div>
                    <div className="team-status-member-info">
                      <strong>{teamPreviewOwner?.name || selectedTeamPreview.createdByName || "Team Leader"}</strong>
                      <span>{teamPreviewOwner?.department || "CIT Student"}</span>
                    </div>
                    {teamPreviewOwner?.id && (
                      <button
                        type="button"
                        className="team-member-profile-button team-preview-profile-button"
                        onClick={() => openTeamMemberProfile({ memberId: teamPreviewOwner.id, memberName: teamPreviewOwner.name })}
                      >
                        <User size={13} />
                        View Profile
                      </button>
                    )}
                  </div>
                </div>

                <div className="team-status-section">
                  <div className="team-status-section-title">Members</div>
                  {teamPreviewMembers.length === 0 ? (
                    <div className="team-status-no-members">No other members have joined yet.</div>
                  ) : (
                    <div className="team-status-member-list">
                      <div className="team-status-member-info" style={{ padding: "4px 0" }}>
                        <strong>
                          {teamPreviewMembers.slice(0, 3).map((person) => person.name || "CIT Student").join(", ")}
                          {teamPreviewMembers.length > 3 ? ` + ${teamPreviewMembers.length - 3} more` : ""}
                        </strong>
                        <span>{teamPreviewMembers.length} other member{teamPreviewMembers.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="team-status-section">
                  <div className="team-status-section-title">Team details</div>
                  <div className="team-status-details">
                    <span><strong>Skills</strong>{selectedTeamPreview.skills || "Not specified"}</span>
                    <span><strong>Team size</strong>{Math.max(1, Array.isArray(selectedTeamPreview.memberIds) ? selectedTeamPreview.memberIds.length : 1)} / {Number(selectedTeamPreview.members) || 1}</span>
                    <span><strong>Team ID</strong>{selectedTeamPreview.teamConnectId || `TEAM-${selectedTeamPreview.id.slice(0, 8).toUpperCase()}`}</span>
                  </div>
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button type="button" className="secondary-button" onClick={closeTeamPreview}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={teamActionLoading || (Number(selectedTeamPreview.members) || 1) <= (Array.isArray(selectedTeamPreview.memberIds) ? selectedTeamPreview.memberIds.length : 1)}
                    onClick={async () => {
                      await joinTeam(selectedTeamPreview);
                      closeTeamPreview();
                    }}
                  >
                    Join Team
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= TEAM STATUS POPUP ================= */}
      {teamStatusOpen && selectedTeam && (
        <div
          className="hackathon-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTeamStatusOpen(false);
              setSelectedTeam(null);
            }
          }}
        >
          <div className="hackathon-modal team-status-modal">
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={() => {
                setTeamStatusOpen(false);
                setSelectedTeam(null);
              }}
              aria-label="Close team status"
            >
              <X size={18} />
            </button>

            <div className="hackathon-modal-icon">
              <Rocket size={28} />
            </div>
            <span className="eyebrow">TEAM STATUS</span>
            <h2>{selectedTeam.title || "Hackathon Team"}</h2>
            <p className="hackathon-modal-description">
              {selectedTeam.idea || "No idea description yet."}
            </p>

            {teamStatusLoading ? (
              <div className="team-status-loading">Loading team status...</div>
            ) : (
              <>
                <div className="team-status-id-pill">{selectedTeam.teamConnectId || `TEAM-${selectedTeam.id.slice(0, 8).toUpperCase()}`}</div>

                <div className="team-status-stats">
                  <div><strong>{selectedTeamMembers.length}</strong><span>Joined</span></div>
                  <div><strong>{Math.max(0, (Number(selectedTeam.members) || 1) - selectedTeamMembers.length)}</strong><span>Slots left</span></div>
                  <div><strong>{selectedTeamPendingInvites.length}</strong><span>Pending invites</span></div>
                </div>

                <div className="team-status-section">
                  <div className="team-status-section-title">Members</div>
                  <div className="team-status-member-list">
                    {selectedTeamMembers.length === 0 ? (
                      <div className="team-status-no-members">No members have joined yet.</div>
                    ) : (
                      selectedTeamMembers.map((member) => (
                        <div className="team-status-member" key={member.id || member.memberId}>
                          <div className="team-status-member-avatar"><User size={15} /></div>
                          <div className="team-status-member-info">
                            <strong>{member.memberName || "CIT Student"}</strong>
                            <span>{member.role === "owner" ? "Owner" : "Member"}</span>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="team-member-profile-button"
                              onClick={() => openTeamMemberProfile(member)}
                            >
                              <User size={13} />
                              View Profile
                            </button>
                            {!teamStatusReadOnly && member.role !== "owner" && (
                              <button
                                type="button"
                                className="team-member-profile-button"
                                disabled={teamActionLoading}
                                onClick={() => removeTeamMember(selectedTeam, member)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="team-status-section">
                  <div className="team-status-section-title">Team details</div>
                  <div className="team-status-details">
                    <span><strong>Skills</strong>{selectedTeam.skills || "Not specified"}</span>
                    <span><strong>Maximum size</strong>{Number(selectedTeam.members) || 1} members</span>
                    <span><strong>Status</strong>{selectedTeamMembers.length >= (Number(selectedTeam.members) || 1) ? "Full" : "Open"}</span>
                  </div>
                </div>

                <div className={`team-status-actions ${teamStatusReadOnly ? "member-view" : ""}`}>
                  <div className="team-status-primary-actions">
                    {!teamStatusReadOnly && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => openTeamInviteStudents(selectedTeam)}
                        disabled={teamInviteLoading || selectedTeamMembers.length >= (Number(selectedTeam.members) || 1)}
                      >
                        <UserPlus size={16} />
                        Invite Students
                      </button>
                    )}

                    <button
                      type="button"
                      className="secondary-button team-chat-open-button"
                      onClick={() => openTeamChat(selectedTeam)}
                    >
                      <MessageCircle size={16} />
                      Team Chat
                    </button>

                    {teamStatusReadOnly && (
                      <button
                        type="button"
                        className="secondary-button team-leave-status-button"
                        disabled={teamActionLoading}
                        onClick={() => {
                          setTeamStatusOpen(false);
                          setSelectedTeam(null);
                          leaveTeam(selectedTeam);
                        }}
                      >
                        Leave Team
                      </button>
                    )}
                  </div>

                  {!teamStatusReadOnly && (
                    <button
                      type="button"
                      className="team-delete-button"
                      disabled={teamActionLoading}
                      onClick={() => deleteTeam(selectedTeam)}
                    >
                      Delete Team
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= TEAM CHAT MODAL ================= */}
      {teamChatOpen && teamChatTeam && (
        <div
          className="team-chat-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTeamChat();
          }}
        >
          <div
            className="team-chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${teamChatTeam.title || "Team"} chat`}
          >
            <div className="team-chat-header">
              <div className="team-chat-header-info">
                <div className="team-chat-header-icon">
                  <MessageCircle size={21} />
                </div>
                <div>
                  <span className="eyebrow">TEAM CHAT</span>
                  <h2>{teamChatTeam.title || "Hackathon Team"}</h2>
                  <p>
                    {selectedTeamMembers.length ||
                      (Array.isArray(teamChatTeam.memberIds)
                        ? teamChatTeam.memberIds.length
                        : 1)}{" "}
                    member{(
                      selectedTeamMembers.length ||
                      (Array.isArray(teamChatTeam.memberIds)
                        ? teamChatTeam.memberIds.length
                        : 1)
                    ) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="hackathon-modal-close"
                onClick={closeTeamChat}
                aria-label="Close team chat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-chat-body">
              {teamChatLoading ? (
                <div className="team-chat-state">
                  <div className="team-chat-state-icon">
                    <MessageCircle size={22} />
                  </div>
                  <strong>Loading team chat...</strong>
                  <span>Connecting to your team's messages.</span>
                </div>
              ) : teamChatError ? (
                <div className="team-chat-state team-chat-error-state">
                  <div className="team-chat-state-icon">
                    <AlertTriangle size={22} />
                  </div>
                  <strong>Chat unavailable</strong>
                  <span>{teamChatError}</span>
                </div>
              ) : teamChatMessages.length === 0 ? (
                <div className="team-chat-state">
                  <div className="team-chat-state-icon">
                    <MessageCircle size={22} />
                  </div>
                  <strong>No messages yet</strong>
                  <span>Start the conversation with your team.</span>
                </div>
              ) : (
                <div className="team-chat-message-list">
                  {teamChatMessages.map((message) => {
                    const ownMessage = message.senderId === authUser.uid;

                    return (
                      <div
                        className={`team-chat-message-row ${ownMessage ? "own" : ""}`}
                        key={message.id}
                      >
                        <div className="team-chat-message-avatar">
                          <User size={14} />
                        </div>

                        <div className="team-chat-message-stack">
                          <div className="team-chat-message-meta">
                            <strong>
                              {ownMessage
                                ? "You"
                                : message.senderName || "CIT Student"}
                            </strong>
                            <span>{formatTeamChatTime(message.createdAt)}</span>
                          </div>

                          <div className="team-chat-message-content-wrap">
                            <div className="team-chat-message-bubble">
                              {message.message}
                            </div>

                            {!ownMessage && (
                              <div className="team-chat-message-menu-wrap">
                                <button
                                  type="button"
                                  className="team-chat-message-menu-button"
                                  onClick={() =>
                                    setTeamChatMessageMenu((current) =>
                                      current === message.id ? null : message.id
                                    )
                                  }
                                  aria-label="Message options"
                                >
                                  <MoreVertical size={15} />
                                </button>

                                {teamChatMessageMenu === message.id && (
                                  <div className="team-chat-message-menu">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTeamChatReportTarget(message);
                                        setTeamChatReportReason("");
                                        setTeamChatReportDescription("");
                                        setTeamChatMessageMenu(null);
                                      }}
                                    >
                                      <Flag size={14} />
                                      Report message
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={teamChatMessagesEndRef} />
                </div>
              )}
            </div>

            <form
              className="team-chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                sendTeamChatMessage();
              }}
            >
              <input
                type="text"
                value={teamChatInput}
                onChange={(e) => setTeamChatInput(e.target.value)}
                placeholder="Write a message to your team..."
                maxLength={2000}
                disabled={teamChatSending || Boolean(teamChatError)}
              />
              <button
                type="submit"
                className="team-chat-send-button"
                disabled={!teamChatInput.trim() || teamChatSending || Boolean(teamChatError)}
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </form>
            <div className="team-chat-composer-note">
              <span>Only current team members can access this chat.</span>
              <span>{teamChatInput.length}/2000</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= DIRECT MESSAGE REPORT MODAL ================= */}
      {directMessageReportTarget && (
        <div
          className="team-chat-report-overlay"
          style={{ zIndex: 10130 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDirectMessageReportTarget(null);
              setDirectMessageReportReason("");
              setDirectMessageReportDescription("");
            }
          }}
        >
          <div
            className="team-chat-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direct-message-report-title"
          >
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={() => {
                setDirectMessageReportTarget(null);
                setDirectMessageReportReason("");
                setDirectMessageReportDescription("");
              }}
              aria-label="Close report"
            >
              <X size={18} />
            </button>

            <div className="team-chat-report-icon">
              <Flag size={22} />
            </div>
            <span className="eyebrow">REPORT MESSAGE</span>
            <h2 id="direct-message-report-title">Report this message?</h2>
            <p>
              Your report will be stored for review. The reported message will not be deleted automatically.
            </p>

            <div className="team-chat-report-message-preview">
              <strong>{directMessageReportTarget.senderName || "CIT Student"}</strong>
              <span>{directMessageReportTarget.message}</span>
            </div>

            <label className="team-chat-report-label">
              Reason
              <StyledSelect
                value={directMessageReportReason}
                options={[
                  { value: "spam", label: "Spam" },
                  { value: "harassment", label: "Harassment / bullying" },
                  { value: "inappropriate", label: "Inappropriate content" },
                  { value: "hate_or_abusive", label: "Hate / abusive content" },
                  { value: "other", label: "Other" },
                ]}
                onChange={setDirectMessageReportReason}
                ariaLabel="Select direct message report reason"
                placeholder="Select a reason"
              />
            </label>

            <label className="team-chat-report-label">
              Additional details <span>Optional</span>
              <textarea
                value={directMessageReportDescription}
                onChange={(event) => setDirectMessageReportDescription(event.target.value)}
                placeholder="Tell us anything that may help with the review..."
                maxLength={1000}
                rows={4}
              />
            </label>

            <div className="team-chat-report-actions">
              <button
                type="button"
                className="team-confirm-cancel"
                onClick={() => {
                  setDirectMessageReportTarget(null);
                  setDirectMessageReportReason("");
                  setDirectMessageReportDescription("");
                }}
                disabled={directMessageReportSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="team-chat-report-submit"
                onClick={submitDirectMessageReport}
                disabled={!directMessageReportReason || directMessageReportSubmitting}
              >
                <Flag size={15} />
                {directMessageReportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TEAM CHAT REPORT MODAL ================= */}
      {teamChatReportTarget && (
        <div
          className="team-chat-report-overlay"
          style={{ zIndex: 10120 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTeamChatReportTarget(null);
              setTeamChatReportReason("");
              setTeamChatReportDescription("");
            }
          }}
        >
          <div
            className="team-chat-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-chat-report-title"
          >
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={() => {
                setTeamChatReportTarget(null);
                setTeamChatReportReason("");
                setTeamChatReportDescription("");
              }}
              aria-label="Close report"
            >
              <X size={18} />
            </button>

            <div className="team-chat-report-icon">
              <Flag size={22} />
            </div>
            <span className="eyebrow">REPORT MESSAGE</span>
            <h2 id="team-chat-report-title">Report this message?</h2>
            <p>
              Your report will be sent to the team owner for review. The message will not be deleted automatically.
            </p>

            <div className="team-chat-report-message-preview">
              <strong>{teamChatReportTarget.senderName || "CIT Student"}</strong>
              <span>{teamChatReportTarget.message}</span>
            </div>

            <label className="team-chat-report-label">
              Reason
              <StyledSelect
                value={teamChatReportReason}
                options={[
                  { value: "spam", label: "Spam" },
                  { value: "harassment", label: "Harassment / bullying" },
                  { value: "inappropriate", label: "Inappropriate content" },
                  { value: "hate_or_abusive", label: "Hate / abusive content" },
                  { value: "other", label: "Other" },
                ]}
                onChange={setTeamChatReportReason}
                ariaLabel="Select team chat report reason"
                placeholder="Select a reason"
              />
            </label>

            <label className="team-chat-report-label">
              Additional details <span>Optional</span>
              <textarea
                value={teamChatReportDescription}
                onChange={(e) => setTeamChatReportDescription(e.target.value)}
                placeholder="Tell us anything that may help with the review..."
                maxLength={1000}
                rows={4}
              />
            </label>

            <div className="team-chat-report-actions">
              <button
                type="button"
                className="team-confirm-cancel"
                onClick={() => {
                  setTeamChatReportTarget(null);
                  setTeamChatReportReason("");
                  setTeamChatReportDescription("");
                }}
                disabled={teamChatReportSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="team-chat-report-submit"
                onClick={submitTeamChatReport}
                disabled={!teamChatReportReason || teamChatReportSubmitting}
              >
                <Flag size={15} />
                {teamChatReportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INVITE STUDENTS MODAL ================= */}
      {teamInviteOpen && selectedTeam && (
        <div
          className="hackathon-modal-overlay"
          style={{ zIndex: 10050 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTeamInviteStudents();
          }}
        >
          <div className="hackathon-modal team-status-modal team-invite-modal">
            <button
              type="button"
              className="hackathon-modal-close"
              onClick={closeTeamInviteStudents}
              aria-label="Close invite students"
            >
              <X size={18} />
            </button>

            <div className="hackathon-modal-icon">
              <UserPlus size={26} />
            </div>

            <span className="eyebrow">INVITE STUDENTS</span>
            <h2>{selectedTeam.title || "Hackathon Team"}</h2>
            <p className="hackathon-modal-description">
              Invite students who are connected with you.
            </p>

            <div className="team-invite-search-wrap">
              <Search size={15} />
              <input
                type="text"
                value={teamInviteSearch}
                onChange={(e) => setTeamInviteSearch(e.target.value)}
                placeholder="Search students..."
              />
            </div>

            <div className="team-invite-student-list">
              {teamInviteStudents.length === 0 ? (
                <div className="team-status-no-members">
                  No students match your search.
                </div>
              ) : (
                teamInviteStudents.map((student) => {
                  const connected = Boolean(getConnectionForStudent(student.id));
                  const pending = getPendingConnectionRequest(student.id);
                  const invitationForStudent = selectedTeamPendingInvites.find(
                    (invite) =>
                      invite.inviteeId === student.id &&
                      invite.status === "pending"
                  );
                  const alreadyInvited = Boolean(invitationForStudent);
                  const teamMember = selectedTeamMembers.some(
                    (member) => member.memberId === student.id
                  );
                  const canInvite =
                    connected &&
                    !alreadyInvited &&
                    !teamMember;

                  return (
                    <div
                      className="team-invite-student"
                      key={`team-invite-${student.id}`}
                    >
                      <div className="team-invite-student-info">
                        <button
                          type="button"
                          className="team-invite-student-profile"
                          onClick={() =>
                            openTeamMemberProfile({
                              memberId: student.id,
                              memberName: student.name,
                            })
                          }
                          title={`View ${student.name || "student"}'s profile`}
                          aria-label={`View ${student.name || "student"}'s profile`}
                        >
                          <User size={15} />
                        </button>

                        <div>
                          <strong>{student.name || "CIT Student"}</strong>
                          <span>{student.year || "Year not added"}</span>
                        </div>
                      </div>

                      <div className="team-invite-student-actions">
                        <button
                          type="button"
                          className="team-invite-view-profile"
                          onClick={() =>
                            openTeamMemberProfile({
                              memberId: student.id,
                              memberName: student.name,
                            })
                          }
                          title={`View ${student.name || "student"}'s profile`}
                        >
                          <User size={13} />
                          View Profile
                        </button>
                        {connected ? (
                          <span className="team-connection-status connected">
                            <UserCheck size={13} />
                            Connected
                          </span>
                        ) : pending ? (
                          <span className="team-connection-status pending">
                            <Mail size={13} />
                            Request Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={connectionActionLoading}
                            onClick={() => sendConnectionRequest(student)}
                          >
                            <UserPlus size={13} />
                            {connectionActionLoading
                              ? "Sending..."
                              : "Connect"}
                          </button>
                        )}

                        <button
                          type="button"
                          className={`primary-button ${
                            !canInvite ? "invite-locked" : ""
                          }`}
                          disabled={!canInvite || teamInviteLoading}
                          onClick={() =>
                            inviteStudentToTeam(student, selectedTeam)
                          }
                          title={
                            teamMember
                              ? "Already a team member."
                              : alreadyInvited
                              ? "Invitation already sent."
                              : !connected
                              ? "Connect with this student first."
                              : "Invite student"
                          }
                        >
                          <Mail size={13} />
                          {teamMember
                            ? "Member"
                            : alreadyInvited
                            ? "Pending"
                            : teamInviteLoading
                            ? "Sending..."
                            : !connected
                            ? "Invite"
                            : "Invite"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="team-invite-footer-note">
              <UserCheck size={13} />
              <span>Only connected students can be invited.</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONNECTION CONFIRMATION MODAL ================= */}

{connectionRemoveTarget && (
  <div
    className="team-confirm-overlay"
    style={{ zIndex: 10000 }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setConnectionRemoveTarget(null);
      }
    }}
  >
    <div
      className="team-confirm-modal"
      style={{
        position: "relative",
        zIndex: 10001,
      }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="team-confirm-close"
        onClick={() => setConnectionRemoveTarget(null)}
        aria-label="Close confirmation"
      >
        <X size={17} />
      </button>

      <div className="team-confirm-icon danger">
        <UserX size={22} />
      </div>

      <span className="eyebrow">
        REMOVE CONNECTION
      </span>

      <h3>
        Remove{" "}
        {connectionRemoveTarget.personName || "this student"}?
      </h3>

      <p>
        They will be removed from your connections and
        you will no longer be connected on CampusConnect.
      </p>

      <div className="team-confirm-actions">
        <button
          type="button"
          className="team-confirm-cancel"
          onClick={() => setConnectionRemoveTarget(null)}
          disabled={connectionActionLoading}
        >
          Cancel
        </button>

        <button
          type="button"
          className="team-confirm-danger"
          disabled={connectionActionLoading}
          onClick={confirmRemoveConnection}
        >
          {connectionActionLoading
            ? "Removing..."
            : "Remove Connection"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* ================= TEAM CONFIRMATION MODALS ================= */}
      {teamRemoveTarget && (
        <div
          className="team-confirm-overlay"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTeamRemoveTarget(null);
          }}
        >
          <div
            className="team-confirm-modal"
            style={{ position: "relative", zIndex: 10001 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="team-confirm-icon"><UserX size={22} /></div>
            <span className="eyebrow">TEAM MEMBER</span>
            <h3>Remove {teamRemoveTarget.member.memberName || "this member"}?</h3>
            <p>They will be removed from <strong>{teamRemoveTarget.team.title || "this team"}</strong> and will lose access to the team.</p>
            <div className="team-confirm-actions">
              <button type="button" className="team-confirm-cancel" onClick={() => setTeamRemoveTarget(null)}>Cancel</button>
              <button type="button" className="team-confirm-danger" disabled={teamActionLoading} onClick={confirmRemoveTeamMember}>{teamActionLoading ? "Removing..." : "Remove Member"}</button>
            </div>
          </div>
        </div>
      )}

      {teamDeleteTarget && (
        <div
          className="team-confirm-overlay"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTeamDeleteTarget(null);
          }}
        >
          <div
            className="team-confirm-modal"
            style={{ position: "relative", zIndex: 10001 }}
            role="dialog"
            aria-modal="true"
          >
            <button type="button" className="team-confirm-close" onClick={() => setTeamDeleteTarget(null)} aria-label="Close confirmation"><X size={17} /></button>
            <div className="team-confirm-icon danger"><Trash2 size={22} /></div>
            <span className="eyebrow">DELETE TEAM</span>
            <h3>Delete {teamDeleteTarget.title || "this team"}?</h3>
            <p>This will permanently remove the team, its memberships, and pending invitations.</p>
            <div className="team-confirm-actions">
              <button type="button" className="team-confirm-cancel" onClick={() => setTeamDeleteTarget(null)}>Cancel</button>
              <button type="button" className="team-confirm-danger" disabled={teamActionLoading} onClick={confirmDeleteTeam}>{teamActionLoading ? "Deleting..." : "Delete Team"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MESSAGE REQUEST COMPOSER ================= */}
      {messageRequestTarget && (
        <div
          className="message-request-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget && !messageRequestSending) {
              setMessageRequestTarget(null);
              setMessageRequestDraft("");
            }
          }}
        >
          <div className="message-request-modal" role="dialog" aria-modal="true" aria-labelledby="message-request-modal-title">
            <button
              type="button"
              className="message-request-modal-close"
              onClick={() => {
                if (!messageRequestSending) {
                  setMessageRequestTarget(null);
                  setMessageRequestDraft("");
                }
              }}
              aria-label="Close message request"
            >
              <X size={17} />
            </button>
            <div className="message-request-modal-icon"><MessageCircle size={22} /></div>
            <span className="eyebrow">MESSAGE REQUEST</span>
            <h3 id="message-request-modal-title">Message {messageRequestTarget.name || "this student"}</h3>
            <p>You are not connected yet. Send a short message request; if they accept, you will become connections and the chat will open.</p>
            <label htmlFor="message-request-draft">Your message</label>
            <textarea
              id="message-request-draft"
              value={messageRequestDraft}
              onChange={(event) => setMessageRequestDraft(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Hi! I'd like to connect with you about..."
              disabled={messageRequestSending}
              autoFocus
            />
            <div className="message-request-modal-footer">
              <span>{messageRequestDraft.length}/2000</span>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={messageRequestSending}
                  onClick={() => {
                    setMessageRequestTarget(null);
                    setMessageRequestDraft("");
                  }}
                >Cancel</button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={messageRequestSending || !messageRequestDraft.trim()}
                  onClick={submitDirectMessageRequest}
                >
                  <Send size={14} /> {messageRequestSending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DIRECT CONVERSATION ACTION CONFIRMATION ================= */}
      {directConversationConfirm && (
        <div
          className="team-confirm-overlay direct-conversation-confirm-overlay"
          style={{ zIndex: 10200 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDirectConversationConfirm(null);
          }}
        >
          <div
            className="team-confirm-modal direct-conversation-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direct-conversation-confirm-title"
          >
            <button type="button" className="team-confirm-close" onClick={() => setDirectConversationConfirm(null)} aria-label="Close confirmation">
              <X size={17} />
            </button>

            <div className={`team-confirm-icon ${directConversationConfirm.action === "unblock" ? "" : "danger"}`}>
              {directConversationConfirm.action === "delete" ? <Trash2 size={22} /> : directConversationConfirm.action === "unblock" ? <UserCheck size={22} /> : <UserX size={22} />}
            </div>

            <span className="eyebrow">
              {directConversationConfirm.action === "delete"
                ? "CLEAR CONVERSATION"
                : directConversationConfirm.action === "unblock"
                  ? "UNBLOCK STUDENT"
                  : "BLOCK STUDENT"}
            </span>

            <h3 id="direct-conversation-confirm-title">
              {directConversationConfirm.action === "delete"
                ? `Clear conversation with ${directConversationConfirm.userName}?`
                : directConversationConfirm.action === "unblock"
                  ? `Unblock ${directConversationConfirm.userName}?`
                  : `Block ${directConversationConfirm.userName}?`}
            </h3>

            <p>
              {directConversationConfirm.action === "delete"
                ? "This clears the conversation and hides all earlier text and media from your history. The other student keeps their copy. A new message can make the chat appear again."
                : directConversationConfirm.action === "unblock"
                  ? "You will be able to message this student again unless they have blocked you."
                  : "You will no longer be able to send messages to this student. Existing messages are not deleted."}
            </p>

            <div className="team-confirm-actions">
              <button type="button" className="team-confirm-cancel" onClick={() => setDirectConversationConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={directConversationConfirm.action === "unblock" ? "primary-button" : "team-confirm-danger"}
                onClick={executeDirectConversationAction}
              >
                {directConversationConfirm.action === "delete"
                  ? "Clear for Me"
                  : directConversationConfirm.action === "unblock"
                    ? "Unblock Student"
                    : "Block Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STUDENT PROFILE POPUP ================= */}
{selectedStudent && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal">

      <button
        className="hackathon-modal-close"
        onClick={() => setSelectedStudent(null)}
      >
        ×
      </button>

      <div className="hackathon-modal-icon">
        <User size={28} />
      </div>

      <span className="eyebrow">
        STUDENT PROFILE
      </span>

      <h2>
        {selectedStudent.name}
      </h2>

      <p className="hackathon-modal-date">
        {selectedStudent.role}
      </p>

      <p className="hackathon-modal-description">
        <strong>CampusConnect ID:</strong>{" "}
        {selectedStudent.campusConnectId || "Not available"}
      </p>

      <p className="hackathon-modal-description">
        <strong>Skills:</strong>{" "}
        {selectedStudent.skills.join(", ")}
      </p>

      <p className="hackathon-modal-description">
        <strong>Status:</strong>{" "}
        {selectedStudent.status}
      </p>

      {getConnectionForStudent(selectedStudent.id) ? (
        <button className="primary-button" type="button" disabled>
          <UserCheck size={16} /> Connected
        </button>
      ) : getIncomingConnectionRequest(selectedStudent.id) ? (
        <div className="connection-response-actions">
          <button
            className="primary-button"
            type="button"
            disabled={connectionActionLoading}
            onClick={() => respondToConnectionRequest(getIncomingConnectionRequest(selectedStudent.id), "accepted")}
          >
            <UserCheck size={16} /> Accept
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={connectionActionLoading}
            onClick={() => respondToConnectionRequest(getIncomingConnectionRequest(selectedStudent.id), "declined")}
          >
            <UserX size={16} /> Decline
          </button>
        </div>
      ) : getPendingConnectionRequest(selectedStudent.id)?.senderId === authUser?.uid ? (
        <button
          className="secondary-button"
          type="button"
          disabled={connectionActionLoading}
          onClick={() =>
            setConnectionRequestCancelTarget(
              getPendingConnectionRequest(selectedStudent.id)
            )
          }
          title="Click to cancel your pending connection request"
        >
          <Mail size={16} /> Request Pending
        </button>
      ) : getPendingConnectionRequest(selectedStudent.id) ? (
        <div className="connection-response-actions">
          <button
            className="primary-button"
            type="button"
            disabled={connectionActionLoading}
            onClick={() =>
              respondToConnectionRequest(
                getIncomingConnectionRequest(selectedStudent.id),
                "accepted"
              )
            }
          >
            <UserCheck size={16} /> Accept
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={connectionActionLoading}
            onClick={() =>
              respondToConnectionRequest(
                getIncomingConnectionRequest(selectedStudent.id),
                "declined"
              )
            }
          >
            <UserX size={16} /> Decline
          </button>
        </div>
      ) : (
        <button
          className="primary-button"
          type="button"
          disabled={connectionActionLoading}
          onClick={() => sendConnectionRequest(selectedStudent)}
        >
          <UserPlus size={16} />
          {connectionActionLoading ? "Sending..." : "Connect"}
        </button>
      )}


      <button
        type="button"
        className="secondary-button student-message-button"
        disabled={directMessageOpening || selectedStudent.id === authUser?.uid}
        onClick={() => openDirectConversation(selectedStudent)}
      >
        <MessageCircle size={15} />
        {directMessageOpening ? "Opening..." : "Message"}
      </button>


      <button
        type="button"
        className="student-profile-full-button"
        onClick={() => {
          const student = selectedStudent;
          setSelectedStudent(null);
          openTeamMemberProfile({
            memberId: student.id,
            memberName: student.name,
          });
        }}
      >
        <User size={15} />
        View Full Profile
      </button>

      {getConnectionForStudent(selectedStudent.id) && userTeams.filter((team) => team.createdBy === authUser.uid).length > 0 && (
        <div className="team-invite-panel">
          <div className="team-invite-heading">
            <strong>Invite to your team</strong>
            <span>Choose one of your teams.</span>
          </div>
          {userTeams.filter((team) => team.createdBy === authUser.uid).map((team) => (
            <button
              type="button"
              className="team-invite-option"
              key={team.id}
              disabled={teamInviteLoading}
              onClick={() => inviteStudentToTeam(selectedStudent, team)}
            >
              <Users size={14} />
              <span>{team.title || "Hackathon Team"}</span>
              <Plus size={14} />
            </button>
          ))}
        </div>
      )}

    </div>
  </div>
)}
{connectionRequestCancelTarget && (
  <div
    className="team-confirm-overlay"
    style={{ zIndex: 10000 }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setConnectionRequestCancelTarget(null);
      }
    }}
  >
    <div
      className="team-confirm-modal"
      style={{
        position: "relative",
        zIndex: 10001,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-connection-request-title"
    >
      <button
        type="button"
        className="team-confirm-close"
        onClick={() => setConnectionRequestCancelTarget(null)}
        aria-label="Close confirmation"
      >
        <X size={17} />
      </button>

      <div className="team-confirm-icon">
        <Mail size={22} />
      </div>

      <span className="eyebrow">CANCEL REQUEST</span>

      <h3 id="cancel-connection-request-title">
        Cancel connection request?
      </h3>

      <p>
        Your pending connection request to{" "}
        <strong>
          {connectionRequestCancelTarget.receiverName || "this student"}
        </strong>{" "}
        will be withdrawn.
      </p>

      <div className="team-confirm-actions">
        <button
          type="button"
          className="team-confirm-cancel"
          onClick={() => setConnectionRequestCancelTarget(null)}
          disabled={connectionActionLoading}
        >
          Keep Request
        </button>

        <button
          type="button"
          className="team-confirm-danger"
          disabled={connectionActionLoading}
          onClick={() =>
            cancelConnectionRequest(connectionRequestCancelTarget)
          }
        >
          {connectionActionLoading ? "Cancelling..." : "Cancel Request"}
        </button>
      </div>
    </div>
  </div>
)}
{accountSettingsOpen && (
  <div
    className="hackathon-modal-overlay"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setAccountSettingsOpen(false);
      }
    }}
  >
    <div
      className="hackathon-modal account-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-settings-title"
    >

      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => setAccountSettingsOpen(false)}
        aria-label="Close account settings"
      >
        <X size={18} />
      </button>

      <div className="hackathon-modal-icon">
        <User size={28} />
      </div>

      <span className="eyebrow">
        ACCOUNT SETTINGS
      </span>

      <h2 id="account-settings-title">
        Settings
      </h2>

      <p className="hackathon-modal-description">
        Manage your account preferences and CampusConnect experience.
      </p>

      {/* ACCOUNT INFORMATION */}
      <div className="settings-option">
        <div>
          <strong>Account Email</strong>
          <span>
            {authUser?.email || "No email available"}
          </span>
        </div>

        <span className="settings-status">
          {authUser?.emailVerified ? "Verified" : "Unverified"}
        </span>
      </div>

      {/* PROFILE */}
      <div className="settings-option">
        <div>
          <strong>Profile</strong>
          <span>
            Update your student information, skills, and bio.
          </span>
        </div>

        <button
          type="button"
          className="settings-action"
          onClick={() => {
            setAccountSettingsOpen(false);
            setViewedProfile(null);
            setActiveNav("profile");
            setProfilePageOpen(true);
            scrollToPageTop();
          }}
        >
          View
        </button>
      </div>

      {/* APPEARANCE */}
      <div className="settings-option">
        <div>
          <strong>Appearance</strong>
          <span>
            {lightMode
              ? "Light mode is currently active."
              : "Dark mode is currently active."}
          </span>
        </div>

        <button
          type="button"
          className="settings-action"
          onClick={() => setLightMode((prev) => !prev)}
        >
          {lightMode ? "Switch to Dark" : "Switch to Light"}
        </button>
      </div>

      {/* NOTIFICATIONS */}
      <div className="settings-option">
        <div>
          <strong>Notifications</strong>
          <span>
            View your latest CampusConnect notifications.
          </span>
        </div>

        <button
          type="button"
          className="settings-action"
          onClick={() => {
            setAccountSettingsOpen(false);
            if (!notificationOpen) {
              openNotifications();
            } else {
              setNotificationOpen(true);
            }
          }}
        >
          View
        </button>
      </div>

      {/* SIGN OUT: available from Account Settings on desktop and mobile */}
      <div className="settings-option settings-option-signout">
        <div>
          <strong>Sign Out</strong>
          <span>
            Sign out of your CampusConnect account on this device.
          </span>
        </div>

        <button
          type="button"
          className="settings-action settings-action-danger"
          onClick={() => {
            setAccountSettingsOpen(false);
            setSignOutOpen(true);
          }}
        >
          Sign Out
        </button>
      </div>

      {/* ACCOUNT STATUS */}
      <div className="settings-option">
        <div>
          <strong>Account Status</strong>
          <span>
            Your CampusConnect account is active and ready to use.
          </span>
        </div>

        <span className="settings-status">
          Active
        </span>
      </div>

    </div>
  </div>
)}
  {signOutOpen && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal signout-modal">

      <div className="hackathon-modal-icon">
        <X size={28} />
      </div>

      <span className="eyebrow">
        SIGN OUT
      </span>

      <h2>
        Sign Out?
      </h2>

      <p className="hackathon-modal-description">
        Are you sure you want to sign out of CampusConnect?
      </p>

      <div className="signout-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={() => setSignOutOpen(false)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={async () => {
try {
  await signOut(auth);
  setSignOutOpen(false);
} catch (error) {
  alert(error.message);
}
          }}
        >
          Sign Out
        </button>

      </div>

    </div>
  </div>
)}

  </main>
{shareSuccess && (
  <div className="success-toast">
    <div className="success-toast-icon">
      <CheckCircle2 size={18} />
    </div>

    <div className="success-toast-content">
      <strong>Resource Shared</strong>
      <span>Your resource has been shared successfully.</span>
    </div>

    <button
      type="button"
      onClick={() => setShareSuccess(false)}
      aria-label="Close notification"
    >
      ×
    </button>
  </div>
)}
{actionToast && (
  <div className={`success-toast ${actionToastTone === "error" ? "action-error-toast" : ""}`}>
    <div className="success-toast-icon">
      {actionToastTone === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
    </div>

    <div className="success-toast-content">
      <strong>CampusConnect</strong>
      <span>{actionToast}</span>
    </div>

    <button
      type="button"
      onClick={() => {
        setActionToast("");
        setActionToastTone("success");
      }}
      aria-label="Close notification"
    >
      ×
    </button>
  </div>
)}
      {deleteResourceTarget && (
        <div
          className="resource-delete-overlay"
          onClick={() => setDeleteResourceTarget(null)}
        >
          <div
            className="resource-delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-resource-title"
          >
            <div className="resource-delete-icon">
              <Trash2 size={24} strokeWidth={2} />
            </div>

            <span className="resource-delete-eyebrow">
              DELETE RESOURCE
            </span>

            <h2 id="delete-resource-title">
              Delete this resource?
            </h2>

            <p>
              This will permanently remove{" "}
              <strong>{deleteResourceTarget.title}</strong>{" "}
              from the CampusConnect community.
            </p>

            <div className="resource-delete-actions">
              <button
                type="button"
                className="resource-delete-cancel"
                onClick={() => setDeleteResourceTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="resource-delete-confirm"
                onClick={confirmDeleteResource}
              >
                <Trash2 size={16} />
                Delete Resource
              </button>
            </div>
          </div>
        </div>
      )}

    </div>




  );

}

export default App;