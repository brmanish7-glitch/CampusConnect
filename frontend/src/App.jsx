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
} from "lucide-react";

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
  setDoc,
  addDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  runTransaction,
  query,
  where,
  updateDoc,
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
const [userMenuOpen, setUserMenuOpen] = useState(false);
const [connectionRequests, setConnectionRequests] = useState([]);
const [connections, setConnections] = useState([]);
const [notifications, setNotifications] = useState([]);
const [teamInvitations, setTeamInvitations] = useState([]);
const [userTeams, setUserTeams] = useState([]);
const [allTeams, setAllTeams] = useState([]);
const [teamMemberships, setTeamMemberships] = useState([]);
const [teamActionLoading, setTeamActionLoading] = useState(false);
const [connectionActionLoading, setConnectionActionLoading] = useState(false);
const [teamInviteLoading, setTeamInviteLoading] = useState(false);
const [teamSearchId, setTeamSearchId] = useState("");
const [selectedTeam, setSelectedTeam] = useState(null);
const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
const [selectedTeamPendingInvites, setSelectedTeamPendingInvites] = useState([]);
const [teamStatusOpen, setTeamStatusOpen] = useState(false);
const [teamStatusLoading, setTeamStatusLoading] = useState(false);
const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
const [signOutOpen, setSignOutOpen] = useState(false);
const [communityFilter, setCommunityFilter] = useState("All");
const [communitySearch, setCommunitySearch] = useState("");
const [showSharedResources, setShowSharedResources] = useState(false);
const [marketplaceOpen, setMarketplaceOpen] = useState(false);
const [exchangeOpen, setExchangeOpen] = useState(false);
const [biddingOpen, setBiddingOpen] = useState(false);
const [profilePageOpen, setProfilePageOpen] = useState(false);
const [editProfileOpen, setEditProfileOpen] = useState(false);
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
    department: data.department || "",
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
      const [incomingSnap, outgoingSnap, connectionsSnap, notificationsSnap, invitationsSnap, teamsSnap, membershipsSnap] =
        await Promise.all([
          getDocs(query(collection(db, "connectionRequests"), where("receiverId", "==", authUser.uid))),
          getDocs(query(collection(db, "connectionRequests"), where("senderId", "==", authUser.uid))),
          getDocs(query(collection(db, "connections"), where("userIds", "array-contains", authUser.uid))),
          getDocs(query(collection(db, "notifications"), where("recipientId", "==", authUser.uid))),
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
      setNotifications(
        notificationsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
      );
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
    await runTransaction(db, async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      if (!teamSnap.exists()) {
        throw new Error("TEAM_NOT_FOUND");
      }

      const currentTeam = { id: teamSnap.id, ...teamSnap.data() };
      const currentMemberIds = Array.isArray(currentTeam.memberIds)
        ? currentTeam.memberIds
        : [currentTeam.createdBy].filter(Boolean);
      const maxMembers = Number(currentTeam.members) || 1;

      if (currentMemberIds.includes(authUser.uid)) {
        throw new Error("ALREADY_MEMBER");
      }

      if (currentMemberIds.length >= maxMembers) {
        throw new Error("TEAM_FULL");
      }

      const nextMemberIds = Array.from(
        new Set([...currentMemberIds, authUser.uid].filter(Boolean))
      );
      const nextCount = nextMemberIds.length;

      transaction.update(teamRef, {
        memberIds: nextMemberIds,
        status: nextCount >= maxMembers ? "Full" : "Open",
      });

      transaction.set(membershipRef, {
        teamId: team.id,
        teamTitle: team.title || "Hackathon Team",
        memberId: authUser.uid,
        memberName: profileData.name || authUser.email || "CIT Student",
        role: "member",
        joinedAt: serverTimestamp(),
      });
    });

    const joinedTeam = {
      ...team,
      memberIds: Array.from(new Set([
        ...(Array.isArray(team.memberIds) ? team.memberIds : [team.createdBy].filter(Boolean)),
        authUser.uid,
      ])),
    };

    setTeamMemberships((prev) => [
      ...prev.filter((item) => item.id !== membershipId),
      {
        id: membershipId,
        teamId: team.id,
        teamTitle: team.title || "Hackathon Team",
        memberId: authUser.uid,
        memberName: profileData.name || authUser.email || "CIT Student",
        role: "member",
      },
    ]);

    setAllTeams((prev) => prev.map((item) =>
      item.id === team.id ? joinedTeam : item
    ));

    setUserTeams((prev) => [
      ...prev.filter((item) => item.id !== team.id),
      joinedTeam,
    ]);

    showActionToast(`You joined ${team.title || "the team"}.`);
  } catch (error) {
    console.error("JOIN TEAM ERROR:", error);
    if (error?.message === "TEAM_FULL") {
      showActionToast("This team is already full.");
    } else if (error?.message === "ALREADY_MEMBER") {
      showActionToast("You are already a member of this team.");
    } else if (error?.message === "TEAM_NOT_FOUND") {
      showActionToast("This team could not be found.");
    } else {
      showActionToast("Unable to join the team. Please try again.");
    }
  } finally {
    setTeamActionLoading(false);
  }
};

const openTeamMemberProfile = async (member) => {
  if (!member?.memberId) return;

  if (member.memberId === authUser?.uid) {
    setSelectedStudent({
      id: authUser.uid,
      name: profileData.name || authUser.email || "CIT Student",
      role: profileData.department || "Student",
      skills: Array.isArray(profileData.skills)
        ? profileData.skills
        : (profileData.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean),
      status: "Available",
      email: authUser.email || "",
      year: profileData.year || "",
      college: profileData.college || "CIT",
      bio: profileData.bio || "",
      campusConnectId: profileData.campusConnectId || "",
    });
    return;
  }

  const teammate = teammates.find((person) => person.id === member.memberId);
  if (teammate) {
    setSelectedStudent(teammate);
    return;
  }

  try {
    const memberSnap = await getDoc(doc(db, "users", member.memberId));
    if (!memberSnap.exists()) {
      showActionToast("Unable to load this member's profile.");
      return;
    }

    const data = memberSnap.data();
    setSelectedStudent({
      id: memberSnap.id,
      name: data.name || data.email?.split("@")[0] || member.memberName || "CIT Student",
      role: normalizeDepartment(data.department || "") || "Student",
      skills: Array.isArray(data.skills)
        ? data.skills
        : (data.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean),
      status: data.status || "Available",
      email: data.email || "",
      year: data.year || "",
      college: data.college || "",
      bio: data.bio || "",
      campusConnectId: data.campusConnectId || "",
    });
  } catch (error) {
    console.error("TEAM MEMBER PROFILE ERROR:", error);
    showActionToast("Unable to load this member's profile.");
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
    // Get the latest team document so Team Status always uses
    // the newest memberIds from Firestore.
    const teamRef = doc(db, "teams", team.id);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      throw new Error("TEAM_NOT_FOUND");
    }

    const latestTeam = {
      id: teamSnap.id,
      ...teamSnap.data(),
    };

    setSelectedTeam(latestTeam);

    // memberIds is the authoritative list of people currently
    // belonging to the team.
    const memberIds = Array.from(
      new Set(
        [
          ...(Array.isArray(latestTeam.memberIds)
            ? latestTeam.memberIds
            : []),
          latestTeam.createdBy,
        ].filter(Boolean)
      )
    );

    // Build the member list from the users already loaded by the app.
    const rows = memberIds.map((memberId) => {
      if (memberId === latestTeam.createdBy) {
        return {
          id: `owner_${latestTeam.id}`,
          memberId,
          memberName:
            latestTeam.createdByName ||
            profileData.name ||
            authUser.email ||
            "Team Owner",
          role: "owner",
        };
      }

      const teammate = teammates.find(
        (person) => person.id === memberId
      );

      return {
        id: `member_${memberId}`,
        memberId,
        memberName: teammate?.name || "CIT Student",
        role: "member",
      };
    });

    setSelectedTeamMembers(rows);

    // Load invitations separately so an invitation read problem
    // can never prevent the member list from appearing.
    try {
      const invitationsSnap = await getDocs(
        query(
          collection(db, "teamInvitations"),
          where("teamId", "==", latestTeam.id)
        )
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

      // Keep the team status working even if invitation loading fails.
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
    showActionToast("Team owners cannot leave their own team.");
    return;
  }

  setTeamActionLoading(true);
  const membershipId = `${team.id}_${authUser.uid}`;

  try {
    await runTransaction(db, async (transaction) => {
      const teamRef = doc(db, "teams", team.id);
      const membershipRef = doc(db, "teamMemberships", membershipId);
      const teamSnap = await transaction.get(teamRef);

      if (!teamSnap.exists()) {
        throw new Error("TEAM_NOT_FOUND");
      }

      const currentTeam = teamSnap.data();
      const currentMemberIds = Array.isArray(currentTeam.memberIds)
        ? currentTeam.memberIds
        : [currentTeam.createdBy].filter(Boolean);

      transaction.update(teamRef, {
        memberIds: arrayRemove(authUser.uid),
        status: "Open",
      });
      transaction.delete(membershipRef);
    });

    setTeamMemberships((prev) => prev.filter((item) => item.id !== membershipId));
    setUserTeams((prev) => prev.filter((item) => item.id !== team.id));
    setAllTeams((prev) => prev.map((item) => item.id === team.id
      ? { ...item, memberIds: (item.memberIds || []).filter((id) => id !== authUser.uid), status: "Open" }
      : item
    ));
    showActionToast(`You left ${team.title || "the team"}.`);
  } catch (error) {
    console.error("LEAVE TEAM ERROR:", error);
    showActionToast("Unable to leave the team. Please try again.");
  } finally {
    setTeamActionLoading(false);
  }
};

const inviteStudentToTeam = async (student, team) => {
  if (!authUser || !student?.id || !team?.id) return;
  if (!getConnectionForStudent(student.id)) {
    showActionToast("Connect with the student before inviting them to a team.");
    return;
  }

  const invitationId = `${team.id}_${student.id}`;
  setTeamInviteLoading(true);
  try {
    const invitationRef = doc(db, "teamInvitations", invitationId);
    const existingSnap = await getDoc(invitationRef);
    if (existingSnap.exists() && ["pending", "accepted"].includes(existingSnap.data()?.status)) {
      showActionToast("This student already has a team invitation.");
      return;
    }

    await setDoc(invitationRef, {
      teamId: team.id,
      teamTitle: team.title || "Hackathon Team",
      inviterId: authUser.uid,
      inviterName: profileData.name || authUser.email || "CIT Student",
      inviteeId: student.id,
      inviteeName: student.name || "CIT Student",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      recipientId: student.id,
      actorId: authUser.uid,
      actorName: profileData.name || authUser.email || "CIT Student",
      type: "team_invitation",
      title: "Team invitation",
      message: `You were invited to join ${team.title || "a team"}.`,
      relatedId: invitationId,
      read: false,
      createdAt: serverTimestamp(),
    });

    setTeamInvitations((prev) => [
      ...prev.filter((item) => item.id !== invitationId),
      { id: invitationId, teamId: team.id, teamTitle: team.title, inviteeId: student.id, status: "pending" },
    ]);
    showActionToast(`Team invitation sent to ${student.name}.`);
  } catch (error) {
    console.error("TEAM INVITATION ERROR:", error);
    showActionToast("Unable to send the team invitation.");
  } finally {
    setTeamInviteLoading(false);
  }
};

const respondToTeamInvitation = async (invitation, decision) => {
  if (!authUser || invitation.inviteeId !== authUser.uid) return;
  setTeamInviteLoading(true);
  try {
    await updateDoc(doc(db, "teamInvitations", invitation.id), {
      status: decision,
      respondedAt: serverTimestamp(),
    });

    if (decision === "accepted") {
      const teamRef = doc(db, "teams", invitation.teamId);
      const membershipRef = doc(db, "teamMemberships", `${invitation.teamId}_${authUser.uid}`);

      await runTransaction(db, async (transaction) => {
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists()) {
          throw new Error("TEAM_NOT_FOUND");
        }

        const teamData = teamSnap.data();
        const currentMemberIds = Array.isArray(teamData.memberIds)
          ? teamData.memberIds
          : [teamData.createdBy].filter(Boolean);
        const maxMembers = Number(teamData.members) || 1;

        if (currentMemberIds.includes(authUser.uid)) {
          return;
        }

        if (currentMemberIds.length >= maxMembers) {
          throw new Error("TEAM_FULL");
        }

        const nextCount = currentMemberIds.length + 1;
        transaction.update(teamRef, {
          memberIds: arrayUnion(authUser.uid),
          status: nextCount >= maxMembers ? "Full" : "Open",
        });
        transaction.set(membershipRef, {
          teamId: invitation.teamId,
          teamTitle: invitation.teamTitle || "Hackathon Team",
          memberId: authUser.uid,
          memberName: profileData.name || authUser.email || "CIT Student",
          role: "member",
          joinedAt: serverTimestamp(),
        });
      });

      const joinedTeam = allTeams.find((team) => team.id === invitation.teamId);
      if (joinedTeam) {
        setUserTeams((prev) => [
          ...prev.filter((team) => team.id !== joinedTeam.id),
          {
            ...joinedTeam,
            memberIds: Array.from(new Set([
              ...(joinedTeam.memberIds || [joinedTeam.createdBy].filter(Boolean)),
              authUser.uid,
            ])),
          },
        ]);
      }

      await addDoc(collection(db, "notifications"), {
        recipientId: invitation.inviterId,
        actorId: authUser.uid,
        actorName: profileData.name || authUser.email || "CIT Student",
        type: "team_invitation_accepted",
        title: "Team invitation accepted",
        message: `${profileData.name || "A student"} joined ${invitation.teamTitle || "your team"}.`,
        relatedId: invitation.teamId,
        read: false,
        createdAt: serverTimestamp(),
      });
      showActionToast(`You joined ${invitation.teamTitle || "the team"}.`);
    } else {
      await addDoc(collection(db, "notifications"), {
        recipientId: invitation.inviterId,
        actorId: authUser.uid,
        actorName: profileData.name || authUser.email || "CIT Student",
        type: "team_invitation_declined",
        title: "Team invitation declined",
        message: `${profileData.name || "A student"} declined your team invitation.`,
        relatedId: invitation.teamId,
        read: false,
        createdAt: serverTimestamp(),
      });
      showActionToast("Team invitation declined.");
    }

    setTeamInvitations((prev) => prev.map((item) =>
      item.id === invitation.id ? { ...item, status: decision } : item
    ));
  } catch (error) {
    console.error("TEAM INVITATION RESPONSE ERROR:", error);
    showActionToast("Unable to update the team invitation.");
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
  setActiveNav("profile");
  setProfilePageOpen(true);
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

        <h1>Your Profile</h1>

        <p>
          Manage your CampusConnect identity, skills,
          and campus activity.
        </p>
      </div>

      <button
        type="button"
        className="profile-back-button"
        onClick={() => {
          setProfilePageOpen(false);
          setActiveNav("home");
        }}
      >
        Back to Home
      </button>
    </div>


    <div className="profile-dashboard-grid">

      <div className="profile-summary-card">

<div className="profile-avatar-large">
  {profileData.name.charAt(0).toUpperCase()}
</div>

        <span className="profile-status">
          ACTIVE STUDENT
        </span>

       <h2>{profileData.name}</h2>

        <p className="profile-role">
          Student • CampusConnect
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
          <strong>{profileData.campusConnectId || "Generating..."}</strong>
        </div>

<p className="profile-about">
  {profileData.bio}
</p>
<button
  type="button"
  className="profile-edit-button"
  onClick={() => setEditProfileOpen(true)}
>
  Edit Profile
</button>

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
            <strong>{profileData.college}</strong>
          </div>

          <div className="profile-info-item">
            <span>DEPARTMENT</span>
            <strong>{profileData.department}</strong>
          </div>

          <div className="profile-info-item">
            <span>YEAR</span>
            <strong>{profileData.year}</strong>
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

          <strong>{activityData.hackathonsJoined}</strong>
          <span>Hackathons Joined</span>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <Users size={18} />
          </div>

<strong>{activityData.teamsCreated}</strong>
          <span>Teams Created</span>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <BookOpen size={18} />
          </div>

<strong>{activityData.resourcesShared}</strong>
          <span>Resources Shared</span>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-icon">
            <CalendarDays size={18} />
          </div>

         <strong>{activityData.eventsAttended}</strong>
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
  {profileData.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .map((skill) => (
      <span key={skill}>{skill}</span>
    ))}
</div>

    </div>

    <div className="profile-connections-card">
      <div className="profile-card-title">
        <span className="eyebrow">NETWORK</span>
        <h3>Your Connections</h3>
      </div>

      {connections.length === 0 ? (
        <div className="profile-empty-state">
          <Users size={18} />
          <span>Your accepted student connections will appear here.</span>
        </div>
      ) : (
        <div className="profile-connections-list">
          {connections.map((connection) => {
            const otherId = connection.userIds?.find((id) => id !== authUser.uid);
            const person = teammates.find((item) => item.id === otherId);
            return (
              <div className="profile-connection-item" key={connection.id}>
                <div className="profile-connection-avatar">
                  {(person?.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{person?.name || "Connected Student"}</strong>
                  <span>{person?.campusConnectId || "CampusConnect ID unavailable"}</span>
                </div>
                <UserCheck size={16} />
              </div>
            );
          })}
        </div>
      )}
    </div>

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
        onClick={() => setNotificationOpen((prev) => !prev)}
        title="Notifications"
    >
        <Bell size={18} />
        <span />
    </button>

    {notificationOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div>
              <strong>Notifications</strong>
              <span>{notifications.filter((item) => !item.read).length} new</span>
            </div>
            <button
              className="notification-close"
              onClick={() => setNotificationOpen(false)}
              title="Close notifications"
            >
              <X size={16} />
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((notification) => (
                <div
                  className={`notification-item ${notification.read ? "read" : ""}`}
                  key={notification.id}
                  onClick={() => markNotificationRead(notification)}
                >
                  <div className="notification-dot" />
                  <div>
                    <strong>{notification.title || "CampusConnect notification"}</strong>
                    <p>{notification.message || "You have a new CampusConnect update."}</p>
                    <small>{notification.read ? "Read" : "New"}</small>
                  </div>
                </div>
              ))
            )}
          </div>

          {connectionRequests.filter((item) => item.receiverId === authUser.uid && item.status === "pending").map((request) => (
            <div className="notification-request" key={`request-${request.id}`}>
              <div>
                <strong>{request.senderName || "Student"}</strong>
                <span>wants to connect with you.</span>
              </div>
              <div className="notification-request-actions">
                <button type="button" onClick={() => respondToConnectionRequest(request, "accepted")} disabled={connectionActionLoading}>
                  <UserCheck size={14} /> Accept
                </button>
                <button type="button" onClick={() => respondToConnectionRequest(request, "declined")} disabled={connectionActionLoading}>
                  <UserX size={14} /> Decline
                </button>
              </div>
            </div>
          ))}

          {teamInvitations.filter((item) => item.inviteeId === authUser.uid && item.status === "pending").map((invitation) => (
            <div className="notification-request" key={`invite-${invitation.id}`}>
              <div>
                <strong>{invitation.teamTitle || "Hackathon Team"}</strong>
                <span>You've been invited to join this team.</span>
              </div>
              <div className="notification-request-actions">
                <button type="button" onClick={() => respondToTeamInvitation(invitation, "accepted")} disabled={teamInviteLoading}>
                  <UserCheck size={14} /> Join
                </button>
                <button type="button" onClick={() => respondToTeamInvitation(invitation, "declined")} disabled={teamInviteLoading}>
                  <UserX size={14} /> Decline
                </button>
              </div>
            </div>
          ))}

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
        setActiveNav("profile");
        setProfilePageOpen(true);
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
                          <button type="button" className="secondary-button" onClick={() => openTeamStatus(team)}>
                            Team Status
                          </button>
                        ) : userTeams.some((mine) => mine.id === team.id) ? (
                          <span className="team-member-badge">Member</span>
                        ) : (
                          <button type="button" className="primary-button" disabled={teamActionLoading} onClick={() => joinTeam(team)}>
                            {teamActionLoading ? "Joining..." : "Join Team"}
                          </button>
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
                              <button type="button" className="primary-button" onClick={() => openTeamStatus(team)}>
                                Team Status
                              </button>
                            ) : (
                              <button type="button" className="secondary-button" disabled={teamActionLoading} onClick={() => leaveTeam(team)}>
                                Leave Team
                              </button>
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
                          <button
                            type="button"
                            className="team-member-profile-button"
                            onClick={() => openTeamMemberProfile(member)}
                          >
                            <User size={13} />
                            View Profile
                          </button>
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
              </>
            )}
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
      ) : getPendingConnectionRequest(selectedStudent.id) ? (
        <button className="secondary-button" type="button" disabled>
          <Mail size={16} /> Request Pending
        </button>
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
            setActiveNav("profile");
            setProfilePageOpen(true);
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
            setNotificationOpen(true);
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