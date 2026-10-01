import { useState, useEffect, useRef } from "react";
import {
  Home,
  Trophy,
  CalendarDays,
  Users,
  BookOpen,
  User,
  Bell,
  Sun,
  Search,
Rocket,
ShoppingBag,
ArrowLeftRight,
Gavel,
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

function App() {
 
const [authUser, setAuthUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const authFlowRef = useRef(null);
const signUpSubmittingRef = useRef(false);
const forgotPasswordSubmittingRef = useRef(false);
const resendSubmittingRef = useRef(false);
const [activeNav, setActiveNav] = useState("home");
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
const [eventInterestIds, setEventInterestIds] = useState(new Set());
const [eventInterestLoading, setEventInterestLoading] = useState(false);
const [selectedEvent, setSelectedEvent] = useState(null);
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
const [teamStatusLoading, setTeamStatusLoading] = useState(false);
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
const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
const [signOutOpen, setSignOutOpen] = useState(false);
const [communityFilter, setCommunityFilter] = useState("All");
const [communitySearch, setCommunitySearch] = useState("");
const [showSharedResources, setShowSharedResources] = useState(false);
const [marketplaceOpen, setMarketplaceOpen] = useState(false);
const [exchangeOpen, setExchangeOpen] = useState(false);
const [biddingOpen, setBiddingOpen] = useState(false);
const [profilePageOpen, setProfilePageOpen] = useState(false);
const [profileNetworkOpen, setProfileNetworkOpen] = useState(false);
const [profileNetworkTab, setProfileNetworkTab] = useState("requests");
const [viewedProfile, setViewedProfile] = useState(null);
const [editProfileOpen, setEditProfileOpen] = useState(false);
const [profileMedia, setProfileMedia] = useState([]);
const [profileMediaLoading, setProfileMediaLoading] = useState(false);
const [profileMediaUploading, setProfileMediaUploading] = useState(false);
const [profileMediaError, setProfileMediaError] = useState("");
const [selectedMedia, setSelectedMedia] = useState(null);
const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
const [profileData, setProfileData] = useState({
  name: "",
  college: "",
  department: "",
  year: "",
  bio: "",
  skills: "",
  campusConnectId: "",
});

const [activityData, setActivityData] = useState({
  hackathonsJoined: 0,
  teamsCreated: 0,
  resourcesShared: 0,
  eventsAttended: 0,
});
const [communityResources, setCommunityResources] = useState([]);

// ================= PHASE 2: REAL REGISTRATIONS =================
const [registeredHackathonIds, setRegisteredHackathonIds] = useState([]);
const [registrationSubmitting, setRegistrationSubmitting] = useState(false);

// ================= PHASE 1: REAL FIRESTORE DATA =================
const [teammates, setTeammates] = useState([]);
const [hackathons, setHackathons] = useState([]);
const [events, setEvents] = useState([]);
const [dashboardStats, setDashboardStats] = useState({
  activeStudents: 0,
  hackathons: 0,
  upcomingEvents: 0,
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

// Load the real CampusConnect data used by the dashboard and community.
// These collections are the Phase 1 data foundation: users, hackathons, events, and teams.
useEffect(() => {
  if (!authUser) {
    setTeammates([]);
    setHackathons([]);
    setEvents([]);
    setRegisteredHackathonIds([]);
    setDashboardStats({
      activeStudents: 0,
      hackathons: 0,
      upcomingEvents: 0,
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
      const [usersSnapshot, hackathonsSnapshot, eventsSnapshot, teamsSnapshot, registrationsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "hackathons")),
          getDocs(collection(db, "events")),
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

      const realHackathons = hackathonsSnapshot.docs.map((hackathonDoc) => ({
        id: hackathonDoc.id,
        ...hackathonDoc.data(),
        icon: hackathonDoc.data().icon || "rocket",
      }));

      const realEvents = eventsSnapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
        icon: eventDoc.data().icon || "calendar",
      }));

      const now = new Date();
      const upcomingEvents = realEvents.filter((event) => {
        if (!event.startAt) return true;

        const startDate =
          typeof event.startAt?.toDate === "function"
            ? event.startAt.toDate()
            : new Date(event.startAt);

        return !Number.isNaN(startDate.getTime()) && startDate >= now;
      });

      const realRegisteredHackathonIds = registrationsSnapshot.docs.map(
        (registrationDoc) => registrationDoc.data().hackathonId
      );

      setTeammates(realTeammates);
      setHackathons(realHackathons);
      setEvents(realEvents);
      setRegisteredHackathonIds(realRegisteredHackathonIds);
      setDashboardStats({
        // A user becomes an active student after completing verified sign-in.
        activeStudents:
          users.filter((person) => person.emailVerified === true).length +
          (users.some((person) => person.id === authUser.uid && person.emailVerified === true)
            ? 0
            : 1),
        hackathons: realHackathons.length,
        upcomingEvents: upcomingEvents.length,
        teamsFormed: teamsSnapshot.size,
      });
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

useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (!user) {
        setAuthUser(null);
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

        if (data) {

setProfileData({
  name: data.name || "",
  college: data.college || "",
  department: normalizeDepartment(
    data.department ||
    data.branch ||
    data.course ||
    data.program ||
    ""
  ),
  year: data.year || "",
  bio: data.bio || "",
  skills: data.skills || "",
  campusConnectId: data.campusConnectId || campusConnectId || "",
});

  setActivityData({
    hackathonsJoined: data.hackathonsJoined || 0,
    teamsCreated: data.teamsCreated || 0,
    resourcesShared: data.resourcesShared || 0,
    eventsAttended: data.eventsAttended || 0,
  });
} else {
  const legacySavedName = localStorage.getItem(
    `campusconnect_name_${user.email?.toLowerCase()}`
  );

  const initialProfile = {
    name: user.displayName || legacySavedName || "",
    email: user.email || "",
    college: "",
    department: "",
    year: "",
    bio: "",
    skills: "",
    hackathonsJoined: 0,
    teamsCreated: 0,
    resourcesShared: 0,
    eventsAttended: 0,
    campusConnectId: "",
  };

  try {
    initialProfile.campusConnectId = await ensureCampusConnectId(user);
  } catch (idError) {
    console.error("CAMPUS ID CREATION ERROR:", idError);
  }

  await setDoc(
    profileRef,
    initialProfile
  );

  setProfileData({
    name: initialProfile.name,
    college: "",
    department: "",
    year: "",
    bio: "",
    skills: "",
    campusConnectId: initialProfile.campusConnectId || "",
  });

  setActivityData({
    hackathonsJoined: 0,
    teamsCreated: 0,
    resourcesShared: 0,
    eventsAttended: 0,
  });
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
      "Only images or PDF files up to 10 MB each can be uploaded."
    );
    return;
  }

  setProfileMediaUploading(true);
  setProfileMediaError("");

  try {
    const firebaseIdToken = await authUser.getIdToken();

    const authResponse = await fetch("/api/imagekit-auth", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${firebaseIdToken}`,
      },
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();

      console.error(
        "IMAGEKIT AUTH ERROR:",
        authResponse.status,
        authError
      );

      throw new Error("IMAGEKIT_AUTH_FAILED");
    }

    const imageKitAuth = await authResponse.json();

    if (
      !imageKitAuth.token ||
      !imageKitAuth.signature ||
      !imageKitAuth.expire ||
      !imageKitAuth.publicKey
    ) {
      throw new Error("IMAGEKIT_AUTH_RESPONSE_INVALID");
    }

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

const normalizedCommunitySearch = communitySearch.toLowerCase().trim();
const [shareResourceOpen, setShareResourceOpen] = useState(false);
const [shareSuccess, setShareSuccess] = useState(false);
const [actionToast, setActionToast] = useState("");
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
const showActionToast = (message) => {
  setActionToast(message);

  setTimeout(() => {
    setActionToast("");
  }, 3000);
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

  const element = document.getElementById(id);

  if (!element) return;

  let topOffset = 95;

  if (id === "hackathons") {
    topOffset = 580;
  } else if (id === "community") {
    topOffset = 150;
  } else if (id === "events") {
    topOffset = 150;
  }

  const elementPosition =
    element.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: elementPosition - topOffset,
    behavior: "smooth",
  });
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

  useEffect(() => {
    let cancelled = false;
    const loadEventInterests = async () => {
      if (!authUser) {
        setEventInterestIds(new Set());
        return;
      }
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "eventInterests"),
            where("userId", "==", authUser.uid)
          )
        );
        const ids = new Set();
        snapshot.forEach((item) => {
          const data = item.data();
          if (data.eventId) ids.add(data.eventId);
        });
        if (!cancelled) setEventInterestIds(ids);
      } catch (error) {
        console.error("EVENT INTEREST LOAD ERROR:", error);
      }
    };
    loadEventInterests();
    return () => { cancelled = true; };
  }, [authUser]);

  const toggleEventInterest = async (event) => {
    if (!authUser) {
      showActionToast("Please sign in to save your interest.");
      return;
    }

    const eventId = event?.id;
    if (!eventId) {
      showActionToast("This event is missing its Firebase ID.");
      return;
    }

    const interestRef = doc(db, "eventInterests", `${authUser.uid}_${eventId}`);
    const isInterested = eventInterestIds.has(eventId);
    setEventInterestLoading(true);

    try {
      if (isInterested) {
        await deleteDoc(interestRef);
        setEventInterestIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        showActionToast("Removed from your interested events.");
      } else {
        await setDoc(interestRef, {
          userId: authUser.uid,
          userName: profileData.name || authUser.email || "CIT Student",
          eventId,
          eventName: event.title || event.name || "Campus Event",
          createdAt: serverTimestamp(),
        });
        setEventInterestIds((prev) => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
        showActionToast("Event saved to your interests!");
      }
    } catch (error) {
      console.error("EVENT INTEREST ERROR:", error);
      showActionToast("Unable to update your interest. Please try again.");
    } finally {
      setEventInterestLoading(false);
    }
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
    eventsAttended: Number(data.eventsAttended) || 0,
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
  if (!authUser || !team?.id || team.createdBy !== authUser.uid) return;

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
        if (memberId === latestTeam.createdBy) {
          return {
            id: `owner_${latestTeam.id}`,
            memberId,
            memberName:
              profileData.name ||
              latestTeam.createdByName ||
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

          const data = memberSnap.exists() ? memberSnap.data() : {};
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
          console.error("TEAM MEMBER LOAD ERROR:", memberError);

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

    setSelectedTeamMembers(rows);

    // Only PENDING invitations are shown as pending.
    // An "accepted" invitation by itself does NOT mean the student
    // is currently a team member; the membership document must exist.
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

const getDataIcon = (iconName, fallback = Code2) => {
  const icons = {
    rocket: Rocket,
    shield: Shield,
    code: Code2,
    code2: Code2,
    palette: Palette,
    database: Database,
    calendar: CalendarDays,
    megaphone: Megaphone,
  };

  return icons[(iconName || "").toString().toLowerCase()] || fallback;
};

const normalizedTeammateSearch = searchText.toLowerCase().trim();
const normalizedTeammateSkill = teammateSkillFilter.toLowerCase().trim();

const normalizeCampusConnectId = (value) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

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

const filteredHackathons = hackathons.filter((hackathon) => {
  const query = searchText.toLowerCase().trim();

  if (!query) return false;

  return (
    (hackathon.name || "").toLowerCase().includes(query) ||
    (hackathon.description || "").toLowerCase().includes(query) ||
    (hackathon.date || "").toLowerCase().includes(query)
  );
});

const filteredEvents = events.filter((event) => {
  const query = searchText.toLowerCase().trim();

  if (!query) return false;

  return (
    (event.title || event.name || "").toLowerCase().includes(query) ||
    (event.date || "").toLowerCase().includes(query) ||
    (event.time || "").toLowerCase().includes(query)
  );
});

const upcomingEventsList = events.filter((event) => {
  if (!event.startAt) return true;

  const startDate =
    typeof event.startAt?.toDate === "function"
      ? event.startAt.toDate()
      : new Date(event.startAt);

  return !Number.isNaN(startDate.getTime()) && startDate >= new Date();
});
if (authLoading) {
  return null;
}
if (!authUser) {
  return (
    <div className={`app-shell ${lightMode ? "light-mode" : ""}`}>
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

  const emailInput = e.currentTarget.querySelector(
    'input[type="email"]'
  );

  const passwordInput = e.currentTarget.querySelector(
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

    e.currentTarget.reset();
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
        Create your CampusConnect account and start connecting with students.
      </p>

      <form
        onSubmit={async (e) => {
e.preventDefault();

const form = e.currentTarget;

const formData = new FormData(form);
const name = formData.get("name");
const email = formData.get("email");
const password = formData.get("password");



if (!name || !email || !password) {
  setSignUpError("Please fill in all fields.");
  return;
}
const profileName = name.toString().trim();
const profileEmail = email.toString().trim().toLowerCase();

if (!isCollegeEmail(profileEmail)) {
  setSignUpError(getCollegeEmailError());
  return;
}

localStorage.setItem(
  `campusconnect_name_${profileEmail}`,
  profileName
);

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
        college: "",
        department: "",
        year: "",
        bio: "",
        skills: "",
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
          type="text"
          name="name"
          placeholder="Full name"
          required
        />

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

  <div className="auth-scroll">
    <div className="auth-scroll-icon">
      ↓
    </div>

    <span>Scroll to explore</span>
  </div>

</div>
    </div>
    </div></div>
  );
}

const profileViewData = viewedProfile || profileData;
const profileViewActivity = viewedProfile?.activityData || activityData;
const viewingOwnProfile = !viewedProfile || viewedProfile.id === authUser?.uid;

return (
  <div className={`app-shell ${lightMode ? "light-mode" : ""}`}>

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

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


  {/* COMMUNITY */}
  <button
    className={
      activeNav === "community"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("community")}
  >
    <Users size={18} />
    <span>Community</span>
  </button>


  {/* EVENTS */}
  <button
    className={
      activeNav === "events"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("events")}
  >
    <CalendarDays size={18} />
    <span>Events</span>
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


  {/* RESOURCES */}
  <button
    className={
      activeNav === "resources"
        ? "nav-item active"
        : "nav-item"
    }
    onClick={() => handleNavigation("resources")}
  >
    <BookOpen size={18} />
    <span>Resources</span>
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
    onClick={() => setEditProfileOpen(true)}
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

          <div className="profile-info-item">
            <span>DEPARTMENT</span>
            <strong>{profileViewData.department || "Not added"}</strong>
          </div>

          <div className="profile-info-item">
            <span>YEAR</span>
            <strong>{profileViewData.year}</strong>
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

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <CalendarDays size={18} />
          </div>

         <strong>{profileViewActivity.eventsAttended}</strong>
          <span>Events Attended</span>
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
    {profileNetworkOpen && (
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
      </div>
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

                return (
                  <div
                    className={`notification-item ${
                      notification.read ? "read" : ""
                    } ${
                      pendingConnectionRequest || pendingTeamInvitation
                        ? "notification-item-actionable"
                        : ""
                    }`}
                    key={notification.id}
                    onClick={() => markNotificationRead(notification)}
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
  onClick={() => setUserMenuOpen((prev) => !prev)}
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
  <div className="user-dropdown">

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
      <User size={16} />
      <span>View Profile</span>
    </button>

    <button
      type="button"
      onClick={() => {
  setUserMenuOpen(false);
  setAccountSettingsOpen(true);
}}
    >
      <User size={16} />
      <span>Account Settings</span>
    </button>

    <div className="user-dropdown-divider" />

    <button
      type="button"
      onClick={() => {
  setUserMenuOpen(false);
  setSignOutOpen(true);
}}
    >
      <X size={16} />
      <span>Sign Out</span>
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
                  : "Search students, hackathons, events..."
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
                <select
                  value={teammateDepartmentFilter}
                  onChange={(e) => setTeammateDepartmentFilter(e.target.value)}
                  style={{ minWidth: 0 }}
                >
                  <option value="">All Departments</option>
                  {teammateDepartments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>

                <select
                  value={teammateYearFilter}
                  onChange={(e) => setTeammateYearFilter(e.target.value)}
                  style={{ minWidth: 0 }}
                >
                  <option value="">All Years</option>
                  {teammateYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

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
                filteredHackathons.map((hackathon) => {
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

              {searchCategory === "hackathons" && filteredHackathons.length === 0 && (
                <div className="search-empty">No hackathons found</div>
              )}

              {(searchCategory === "events" || searchCategory === "all") &&
                filteredEvents.map((event) => {
                  const Icon = getDataIcon(event.icon, CalendarDays);
                  return (
                    <button
                      type="button"
                      key={`event-${event.id || event.title || event.name}`}
                      className="search-result"
                      onClick={() => {
                        setSearchOpen(false);
                        setSelectedEvent(event);
                      }}
                    >
                      <div className="search-result-icon"><Icon size={18} /></div>
                      <div className="search-result-info">
                        <strong>{event.title || event.name}</strong>
                        <span>{event.date || "Date TBA"}</span>
                      </div>
                      <CalendarDays size={16} />
                    </button>
                  );
                })}

              {searchCategory === "events" && filteredEvents.length === 0 && (
                <div className="search-empty">No events found</div>
              )}

              {searchCategory === "all" &&
                filteredTeammates.length === 0 &&
                filteredHackathons.length === 0 &&
                filteredEvents.length === 0 && (
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
                  Explore Hackathons
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
                <CalendarDays size={19} />
              </div>

              <div>
                <strong>{dataLoading ? "..." : dashboardStats.upcomingEvents}</strong>
                <span>Upcoming Events</span>
                <small>Learn, connect, grow</small>
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

          {/* CREATE TEAM */}

          <section className="create-team-card">

            <div className="section-heading centered">

              <span className="eyebrow">
                BUILD YOUR TEAM
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

          <section className="lower-section teams-section" id="teams">
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
                  placeholder="KHDKJDHJ"
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
                        <div className="team-modern-card" key={team.id}>
                          <div className="team-card-icon"><Rocket size={18} /></div>
                          <div className="team-card-main">
                            <div className="team-card-title-row">
                              <h4>{team.title || "Hackathon Team"}</h4>
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
                          <div className="team-card-actions">
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

          {/* HACKATHONS */}

          <section
            className="lower-section"
            id="hackathons"
          >

            <div className="section-heading">

              <span className="eyebrow">
                DISCOVER
              </span>

              <h2>
                Upcoming Hackathons
              </h2>

            </div>

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
                    Hackathons you've marked as interested in
                  </span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.8 }}>
                  {hackathonInterestIds.size} saved
                </span>
              </div>

              {hackathonInterestIds.size === 0 ? (
                <div style={{ fontSize: "12px", opacity: 0.62 }}>
                  No saved hackathons yet. Open a challenge and click ⭐ I'm Interested.
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

              {hackathons.length === 0 && !dataLoading && (
                <div className="search-empty">
                  {dataError || "No hackathons available yet."}
                </div>
              )}

              {hackathons.map((hackathon) => {
                const Icon = getDataIcon(hackathon.icon, Trophy);

                return (
                  <div className="event-card" key={hackathon.id}>

                    <div className="event-icon">
                      <Icon size={21} />
                    </div>

                    <div>
                      <span className="event-date">
                        {hackathon.date || "DATE TBA"}
                      </span>

                      <h3>
                        {hackathon.name || "Untitled Hackathon"}
                      </h3>

                      <p>
                        {hackathon.description || "Hackathon details will be announced soon."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedHackathon(hackathon)}
                    >
                      View Challenge
                    </button>

                  </div>
                );
              })}

            </div>

          </section>


          {/* EVENTS */}
 {/* TEAMMATES */}

          <section
            className="teammates-section"
            id="community"
          >

            <div className="section-heading">

              <span className="eyebrow">
                FIND YOUR TEAM
              </span>

              <h2>
                Meet Your Future Hackathon Teammates
              </h2>

              <p>
                Discover students with different skills
                and connect with the right people for your idea.
              </p>

            </div>


            <div className="teammate-grid">

              {teammates.length === 0 && !dataLoading && (
                <div className="search-empty">
                  {dataError || "No other students have joined yet."}
                </div>
              )}

              {teammates.map((person) => {
                const Icon = person.icon || Code2;

                return (
                  <div
                    className="teammate-card"
                    key={person.id || person.email || person.name}
                  >

                    <div className="teammate-top">

                      <div className="person-avatar">
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="person-info">
                        <h3>{person.name}</h3>
                        <span>
                          {person.campusConnectId || "CampusConnect ID pending"}
                          {person.role ? ` • ${person.role}` : ""}
                        </span>
                      </div>

                      <span className="availability">
                        {person.status || "Available"}
                      </span>

                    </div>

                    <div className="person-skills">
                      {person.skills.length > 0 ? (
                        person.skills.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))
                      ) : (
                        <span>No skills added</span>
                      )}
                    </div>

                    <button
                      className="connect-button"
                      onClick={() => setSelectedStudent(person)}
                    >
                      <Icon size={16} />
                      Connect
                    </button>

                  </div>
                );
              })}

            </div>
          </section>
          <section
            className="lower-section"
            id="events"
          >

            <div className="section-heading">

              <span className="eyebrow">
                CAMPUS LIFE
              </span>

              <h2>
                Upcoming Events
              </h2>

            </div>


            <div className="simple-events">

              {upcomingEventsList.length === 0 && !dataLoading && (
                <div className="search-empty">
                  {dataError || "No upcoming events available yet."}
                </div>
              )}

              {upcomingEventsList.map((event) => {
                const Icon = getDataIcon(event.icon, CalendarDays);

                return (
                  <div
                    className="simple-event"
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Icon size={21} />
                    <div>
                      <strong>{event.title || event.name || "Campus Event"}</strong>
                      <span>
                        {event.date || "Date TBA"}
                        {event.time ? ` • ${event.time}` : ""}
                      </span>
                    </div>
                    <Clock3 size={17} />
                  </div>
                );
              })}

            </div>

            {/* SAVED EVENT INTERESTS */}
            <div
              style={{
                margin: "22px 0 0",
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
                  marginBottom: eventInterestIds.size ? "12px" : "0",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>
                    ⭐ Your Saved Events
                  </strong>
                  <span style={{ fontSize: "11px", opacity: 0.68 }}>
                    Events you've marked as interested in
                  </span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, opacity: 0.8 }}>
                  {eventInterestIds.size} saved
                </span>
              </div>

              {eventInterestIds.size === 0 ? (
                <div style={{ fontSize: "12px", opacity: 0.62 }}>
                  No saved events yet. Open an event and click ⭐ I'm Interested.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "9px",
                  }}
                >
                  {events
                    .filter((event) => eventInterestIds.has(event.id))
                    .map((event) => (
                      <button
                        key={`saved-event-${event.id}`}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
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
                        <CalendarDays size={13} />
                        {event.title || event.name || "Campus Event"}
                      </button>
                    ))}
                </div>
              )}
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
  Buy, exchange, or bid on useful resources shared by students across campus.
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
      <h3>Exchange</h3>

      <p>
        Trade books, project resources, and other
        useful items directly with other students.
      </p>

     <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setExchangeOpen(true);
  }}
>
  Find Exchanges
</button>
    </div>
  </div>


  {/* BIDDING */}
<div
  className="resource-card"
  onClick={() => setBiddingOpen(true)}
>
    <div className="resource-icon orange">
      <Gavel size={22} />
    </div>

    <div className="resource-content">
      <h3>Bidding</h3>

      <p>
        Discover student listings and place bids on
        items through a simple auction system.
      </p>
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setBiddingOpen(true);
  }}
>
  View Auctions
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

      <h3>Your Shared Resources</h3>

      <p>
        Resources you've shared with the CampusConnect community.
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
  key={`${resource.title}-${index}`}
>

  <div className="shared-resource-icon">
    <BookOpen size={22} />
  </div>

  <div className="shared-resource-content">

    <span className="community-resource-category">
      {resource.category}
    </span>

    <h3>
      {resource.title}
    </h3>

    <p>
      {resource.description}
    </p>

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
  <div
    className="exchange-modal-overlay"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0,0.75)",
    }}
  >
    <div className="exchange-modal">

      <div className="exchange-modal-header">
        <div>
          <span className="community-resource-category">
            STUDENT MARKETPLACE
          </span>

          <h3>Buy & Sell</h3>
        </div>

        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => setMarketplaceOpen(false)}
          aria-label="Close marketplace"
        >
          <X size={18} />
        </button>
      </div>

      <div className="exchange-listings">

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              TEXTBOOK
            </span>

            <h4>Engineering Mathematics Book</h4>

            <p>
              Used textbook in good condition.
            </p>
          </div>

          <strong>₹450</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              PROJECT KIT
            </span>

            <h4>Arduino Starter Kit</h4>

            <p>
              Complete kit with sensors and components.
            </p>
          </div>

          <strong>₹850</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              CALCULATOR
            </span>

            <h4>Scientific Calculator</h4>

            <p>
              Working perfectly and lightly used.
            </p>
          </div>

          <strong>₹600</strong>
        </div>

      </div>
    </div>
  </div>
)}
{exchangeOpen && (
  <div
    className="exchange-modal-overlay"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.75)",
    }}
  >
    <div className="exchange-modal">

      <div className="exchange-modal-header">
        <div>
          <span className="community-resource-category">
            STUDENT EXCHANGE
          </span>

          <h3>Exchange Items</h3>
        </div>

        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => setExchangeOpen(false)}
          aria-label="Close exchange"
        >
          <X size={18} />
        </button>
      </div>

      <div className="exchange-listings">

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              TEXTBOOK
            </span>

            <h4>Engineering Physics Book</h4>

            <p>
              Looking to exchange for Engineering Mathematics.
            </p>
          </div>

          <strong>↔</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              PROJECT KIT
            </span>

            <h4>ESP32 Development Kit</h4>

            <p>
              Exchange for Arduino or Raspberry Pi components.
            </p>
          </div>

          <strong>↔</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              CALCULATOR
            </span>

            <h4>Casio Scientific Calculator</h4>

            <p>
              Exchange for another compatible scientific calculator.
            </p>
          </div>

          <strong>↔</strong>
        </div>

      </div>
    </div>
  </div>
)}
  
  
{biddingOpen && (
  <div
    className="exchange-modal-overlay"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.75)",
    }}
  >
    <div className="exchange-modal">

      <div className="exchange-modal-header">
        <div>
          <span className="community-resource-category">
            STUDENT AUCTIONS
          </span>

          <h3>Live Bidding</h3>
        </div>

        <button
          type="button"
          className="exchange-modal-close"
          onClick={() => setBiddingOpen(false)}
          aria-label="Close auctions"
        >
          <X size={18} />
        </button>
      </div>

      <div className="exchange-listings">

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              PROJECT KIT
            </span>

            <h4>Arduino Uno Starter Kit</h4>

            <p>
              Current highest bid: ₹700
            </p>
          </div>

          <strong>₹750</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              CALCULATOR
            </span>

            <h4>Casio FX-991ES Plus</h4>

            <p>
              Current highest bid: ₹500
            </p>
          </div>

          <strong>₹550</strong>
        </div>

        <div className="exchange-listing-card">
          <div>
            <span className="exchange-listing-category">
              TEXTBOOK
            </span>

            <h4>Data Structures & Algorithms</h4>

            <p>
              Current highest bid: ₹300
            </p>
          </div>

          <strong>₹350</strong>
        </div>

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

  const updatedProfile = {
    name:
      formData.get("name")?.toString().trim() || "",

    college:
      formData.get("college")?.toString().trim() || "",

    department:
      normalizeDepartment(formData.get("department")?.toString() || ""),

    year:
      formData.get("year")?.toString() || "",

    bio:
      formData.get("bio")?.toString().trim() || "",

    skills:
      formData.get("skills")?.toString().trim() || "",

    email: authUser.email || "",
    campusConnectId: profileData.campusConnectId || "",
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
    defaultValue={profileData.name}
    required
  />
</label>

<label>
  College
  <input
    type="text"
    name="college"
    defaultValue={profileData.college}
    required
  />
</label>

<label>
  Department
  <select
    name="department"
    defaultValue={normalizeDepartment(profileData.department)}
    required
  >
    <option value="" disabled>Select your department</option>
    {DEPARTMENT_OPTIONS.map((department) => (
      <option key={department} value={department}>{department}</option>
    ))}
  </select>
</label>

<label>
  Year
  <select
    name="year"
    defaultValue={profileData.year}
    required
  >
    <option value="1st Year">1st Year</option>
    <option value="2nd Year">2nd Year</option>
    <option value="3rd Year">3rd Year</option>
    <option value="4th Year">4th Year</option>
  </select>
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
      
      <div className="hackathon-modal-overlay">
        <div className="hackathon-modal">

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

          <p className="hackathon-modal-description">
            {selectedHackathon.description}
          </p>

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
    className="primary-button"
    onClick={() => toggleHackathonInterest(selectedHackathon)}
    disabled={hackathonInterestLoading}
  >
    {hackathonInterestIds.has(selectedHackathon.id) ? "✓ Interested" : "⭐ I'm Interested"}
  </button>
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
</div>
<p className="hackathon-modal-description" style={{ marginTop: "12px", fontSize: "10px" }}>
  Official registration will be handled by the hackathon organizer.
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
              onClick={() => setShareResourceOpen(false)}
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

const newResource = {
  title,
  category,
  description,
  link,
  userId: authUser?.uid || "",
  userEmail: authUser?.email || "",
  createdAt: new Date(),
};

  setCommunityResources((prev) => [
    ...prev,
    newResource,
  ]);
  
  if (authUser) {
  try {
    await setDoc(
      doc(db, "users", authUser.uid),
      {
        resourcesShared: increment(1),
      },
      { merge: true }
    );

    setActivityData((prev) => ({
      ...prev,
      resourcesShared: prev.resourcesShared + 1,
    }));
  } catch (error) {
    console.error(
      "RESOURCE ACTIVITY UPDATE ERROR:",
      error
    );
  }
}

  setShareResourceOpen(false);
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
                <select
  name="category"
  defaultValue=""
  required
>
                  <option value="" disabled>
                    Select a category
                  </option>

                  <option value="Question Papers">
                    Question Papers
                  </option>

                  <option value="Hackathon Resources">
                    Hackathon Resources
                  </option>

                  <option value="Projects & References">
                    Projects & References
                  </option>
                </select>
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
              >
                Share Resource
              </button>

            </form>

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
          <div className="hackathon-modal team-status-modal team-invite-modal">
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
                  <div className="team-status-member">
                    <div className="team-status-member-avatar"><User size={15} /></div>
                    <div className="team-status-member-info">
                      <strong>{teamPreviewOwner?.name || selectedTeamPreview.createdByName || "Team Leader"}</strong>
                      <span>{teamPreviewOwner?.department || "CIT Student"}</span>
                    </div>
                    {teamPreviewOwner?.id && (
                      <button
                        type="button"
                        className="team-member-profile-button"
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
              <div className="team-status-loading">Loading your team status...</div>
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
                            {member.role !== "owner" && (
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

                <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openTeamInviteStudents(selectedTeam)}
                      disabled={teamInviteLoading || selectedTeamMembers.length >= (Number(selectedTeam.members) || 1)}
                    >
                      <UserPlus size={16} />
                      Invite Students
                    </button>

                    <button
                      type="button"
                      className="secondary-button team-chat-open-button"
                      onClick={() => openTeamChat(selectedTeam)}
                    >
                      <MessageCircle size={16} />
                      Team Chat
                    </button>
                  </div>

                  <button
                    type="button"
                    className="team-delete-button"
                    disabled={teamActionLoading}
                    onClick={() => deleteTeam(selectedTeam)}
                  >
                    Delete Team
                  </button>
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
              <select
                value={teamChatReportReason}
                onChange={(e) => setTeamChatReportReason(e.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment / bullying</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="hate_or_abusive">Hate / abusive content</option>
                <option value="other">Other</option>
              </select>
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
{selectedEvent && (
  <div className="hackathon-modal-overlay">
    <div className="hackathon-modal event-modal">
      <button
        type="button"
        className="hackathon-modal-close"
        onClick={() => setSelectedEvent(null)}
        aria-label="Close event details"
      >
        <X size={18} />
      </button>

      <div className="hackathon-modal-icon">
        {(() => {
          const EventIcon = getDataIcon(selectedEvent.icon, CalendarDays);
          return <EventIcon size={28} />;
        })()}
      </div>

      <span className="eyebrow">UPCOMING EVENT</span>

      <h2>{selectedEvent.title || selectedEvent.name}</h2>

      <p className="hackathon-modal-description">
        Join this upcoming campus event and connect with other students.
      </p>

      <div className="event-detail-info">
        <div>
          <CalendarDays size={16} />
          <span>{selectedEvent.date || "Date TBA"}</span>
        </div>

        <div>
          <Clock3 size={16} />
          <span>{selectedEvent.time || "Time TBA"}</span>
        </div>
      </div>

      <div
        className="hackathon-modal-actions"
        style={{ justifyContent: "center", gap: "12px" }}
      >
        <button
          type="button"
          className="primary-button"
          onClick={() => toggleEventInterest(selectedEvent)}
          disabled={eventInterestLoading}
        >
          {eventInterestIds.has(selectedEvent.id)
            ? "✓ Interested"
            : "⭐ I'm Interested"}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setSelectedEvent(null);
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
          type="button"
          className="secondary-button"
          onClick={() =>
            showActionToast("Event registration will be handled by the organizer.")
          }
        >
          Official Registration
        </button>
      </div>

      <p
        style={{
          margin: "12px 0 0",
          textAlign: "center",
          fontSize: "11px",
          opacity: 0.62,
        }}
      >
        CampusConnect helps you discover and save events. Official registration is handled by the event organizer.
      </p>
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
  <div className="success-toast">
    <div className="success-toast-icon">
      <CheckCircle2 size={18} />
    </div>

    <div className="success-toast-content">
      <strong>CampusConnect</strong>
      <span>{actionToast}</span>
    </div>

    <button
      type="button"
      onClick={() => setActionToast("")}
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