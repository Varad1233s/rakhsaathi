import { useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Droplet,
  Heart,
  HeartHandshake,
  Hospital,
  Info,
  Lock,
  MapPin,
  Menu as MenuIcon,
  Phone,
  PhoneCall,
  PlusCircle,
  Radio,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  BLOOD_GROUPS,
  type BloodGroup
} from '@/types';
import {
  ROLE_HOME,
  bloodLabel,
  donorsForRecipient,
  recipientsForDonor
} from '@/utils/format';
import { Responsive } from '@/components/common';

const BLOOD_FACTS: Record<BloodGroup, { name: string; tag: string; description: string }> = {
  O_NEG: {
    name: 'O Negative',
    tag: 'Universal Red Cell Donor',
    description: 'Can be transfused to any patient in extreme emergencies regardless of blood type. In highest demand for trauma centers.'
  },
  O_POS: {
    name: 'O Positive',
    tag: 'Most Common Blood Group',
    description: 'Can donate to any positive blood group (A+, B+, AB+, O+). Represents roughly 38% of the population.'
  },
  A_NEG: {
    name: 'A Negative',
    tag: 'Rare & Critical Donor',
    description: 'Can donate red blood cells to A-, A+, AB-, and AB+. Rare and vital for targeted pediatric care.'
  },
  A_POS: {
    name: 'A Positive',
    tag: 'Second Most Prevalent',
    description: 'Can donate to A+ and AB+ recipients. High demand for daily surgical procedures and routine oncology.'
  },
  B_NEG: {
    name: 'B Negative',
    tag: 'High Scarcity Group',
    description: 'Makes up under 2% of the population. Can donate to B-, B+, AB-, and AB+ patients in need.'
  },
  B_POS: {
    name: 'B Positive',
    tag: 'Prevalent in South Asia',
    description: 'One of the most frequently requested groups across regional trauma networks. Can donate to B+ and AB+.'
  },
  AB_NEG: {
    name: 'AB Negative',
    tag: 'Rarest Blood Group',
    description: 'The rarest blood type (<1%). Can donate red cells to AB- and AB+, and is a universal plasma donor.'
  },
  AB_POS: {
    name: 'AB Positive',
    tag: 'Universal Red Cell Recipient',
    description: 'Can safely receive red blood cells from any blood group (O-, O+, A-, A+, B-, B+, AB-, AB+).'
  }
};

const FEATURES = [
  {
    icon: <ShieldCheck size={26} />,
    title: 'Hospital-Verified Requests',
    desc: 'Every single distress request is reviewed and authorized by an attending hospital doctor before alerting donors. Fake forwards and panic spam are stopped cold.',
    tag: 'Zero Hoaxes'
  },
  {
    icon: <Lock size={26} />,
    title: 'Strict Donor Privacy',
    desc: 'Your exact GPS coordinates are NEVER revealed to requesters or other users. The system calculates distance securely on the server and only shares an approximate distance (e.g. ≈ 2.5 km).',
    tag: 'End-to-End Privacy'
  },
  {
    icon: <BellRing size={26} />,
    title: 'Real-Time Socket Dispatch',
    desc: 'Instant notifications are pushed directly to compatible nearby donors and blood banks the moment clinical verification happens, with live delivery timelines.',
    tag: 'Instant Alerts'
  },
  {
    icon: <Building2 size={26} />,
    title: 'Blood Bank Inventory Sync',
    desc: 'Registered blood banks track real-time stocks with FIFO/FEFO expiry management and can fulfill urgent requests partially or fully from existing reserves.',
    tag: 'Live Stock'
  },
  {
    icon: <Zap size={26} />,
    title: 'Anti-Duplicate Intelligence',
    desc: 'Algorithmic checks flag potential duplicate or cross-posted requests across neighboring hospitals to prevent double-booking scarce voluntary donors.',
    tag: 'Fraud Shield'
  },
  {
    icon: <Activity size={26} />,
    title: 'Complete Immutable Audit',
    desc: 'Every action—from verification to donor response and unit allocation—is timestamped with digital audit trails for complete medical compliance.',
    tag: 'Audit Ready'
  }
];

const STEPS = [
  {
    num: '01',
    title: 'Create Verified Request',
    actor: 'Patient / Relative',
    desc: 'Fill in patient details, required blood group, units, and select from verified hospitals. The request enters hospital pending verification.',
    icon: <PlusCircle size={22} />
  },
  {
    num: '02',
    title: 'Doctor Clinical Sign-off',
    actor: 'Hospital Desk',
    desc: 'The hospital confirms inpatient admission and transfusion urgency. The request is officially certified and dispatched.',
    icon: <Hospital size={22} />
  },
  {
    num: '03',
    title: 'Smart Proximity Outreach',
    actor: 'Verified Donors',
    desc: 'Nearby compatible donors within matching radius receive immediate alerts. Donors confirm willingness with a single tap.',
    icon: <MapPin size={22} />
  },
  {
    num: '04',
    title: 'Stock Allocation & Transfusion',
    actor: 'Bank & Clinicians',
    desc: 'Blood banks allocate physical units and hospital clinicians perform cross-match screening before safe transfusion.',
    icon: <CheckCircle2 size={22} />
  }
];

const STAKEHOLDERS = [
  {
    label: 'Patients & Families',
    title: 'Fast distress outreach without social media chaos',
    desc: 'When an emergency occurs, families usually waste precious hours copying unverified messages across messaging apps. RaktSaathi gives you an official verified request link with live donor and inventory progress.',
    points: [
      'Verified hospital credentials prevent scams and exploitative middle-men',
      'Live status bar reveals incoming donor pledges and allocated blood bank units',
      'Direct coordination with the hospital clinical desk'
    ],
    cta: 'Post an urgent request',
    role: 'REQUESTER'
  },
  {
    label: 'Voluntary Donors',
    title: 'Save lives without sacrificing your personal privacy',
    desc: 'Help emergency patients in your neighborhood on your terms. You only get notified when an actual hospital verifies a genuine patient need matching your blood group.',
    points: [
      'Exact location is never made public—only distance rounded to 0.5 km',
      'Toggle availability on/off anytime with one switch',
      'Track your lifetime donation impact and eligibility countdown'
    ],
    cta: 'Register as a donor',
    role: 'DONOR'
  },
  {
    label: 'Hospitals & ICUs',
    title: 'Stop emergency stock shortages with certified requests',
    desc: 'Medical coordinators and ICU staff can verify admissions, coordinate directly with responsive voluntary donors, and tap into regional blood bank inventories.',
    points: [
      'Digital verification portal removes unauthorized panic appeals',
      'Real-time access to nearby donor confirmations and contact details',
      'Seamless multi-bank stock allocation for major trauma cases'
    ],
    cta: 'Register your hospital',
    role: 'HOSPITAL'
  },
  {
    label: 'Blood Banks',
    title: 'Modern inventory, expiry monitoring, and fulfillment',
    desc: 'Manage daily component stock, receive alerts on approaching expiration dates, and supply critical units directly to verified hospital distress calls.',
    points: [
      'FEFO (First-Expired, First-Out) shelf-life monitoring',
      'Single-click allocation to urgent verified hospital emergencies',
      'Complete supply traceability and automated logbook'
    ],
    cta: 'Connect your blood bank',
    role: 'BLOODBANK'
  }
];

const FAQS = [
  {
    q: 'How does RaktSaathi guarantee that requests are genuine?',
    a: 'Unlike unverified messages on social media, every blood request on RaktSaathi must be officially authenticated by the medical staff of the admitting hospital before any donor is notified. This eliminates fake numbers, outdated appeals, and hoax forwards.'
  },
  {
    q: 'Will other users see my home address or exact live GPS coordinates?',
    a: 'Never. Donor privacy is our primary engineering principle. Donor coordinates are processed strictly inside the server for radius calculations. Requesters and hospitals only see an approximate distance (e.g. "≈ 2.5 km away"). You can also toggle location sharing off anytime.'
  },
  {
    q: 'Is RaktSaathi completely free to use?',
    a: 'Yes, 100% free. RaktSaathi is built as a public healthcare coordination infrastructure. We never charge patients, donors, or hospitals for requesting, matching, or notifying lifesavers.'
  },
  {
    q: 'Who is eligible to donate blood?',
    a: 'Generally, healthy individuals between 18 and 65 years of age, weighing at least 45 kg, with no recent blood donation in the last 90 days (for men) or 120 days (for women). Final medical eligibility and hemoglobin screening is performed at the hospital.'
  },
  {
    q: 'How do blood banks contribute to urgent requests?',
    a: 'Verified blood banks list their available units on the platform. When an urgent hospital request is posted, nearby blood banks can review and instantly allocate compatible stored units, fulfilling the need even before donors arrive.'
  },
  {
    q: 'Can I add a hospital if it is not already in the list?',
    a: 'Yes! When registering as hospital staff or filing a request, you can submit your hospital details. An admin reviews the license and address, after which the hospital is certified to verify requests.'
  }
];

export default function Landing() {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O_POS');
  const [activeTab, setActiveTab] = useState(0);

  // Eligibility quiz state
  const [quizAge, setQuizAge] = useState(true);
  const [quizWeight, setQuizWeight] = useState(true);
  const [quizInterval, setQuizInterval] = useState(true);
  const [quizHealth, setQuizHealth] = useState(true);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const isEligible = quizAge && quizWeight && quizInterval && quizHealth;
  const compatibleDonors = donorsForRecipient(selectedGroup);
  const compatibleRecipients = recipientsForDonor(selectedGroup);
  const currentGroupFact = BLOOD_FACTS[selectedGroup];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', color: '#0F172A', overflowX: 'hidden' }}>
      {/* Emergency Helpline Top Ribbon */}
      <Box
        sx={{
          background: 'linear-gradient(90deg, #991B1B 0%, #E11D48 50%, #BE123C 100%)',
          color: '#FFFFFF',
          py: 0.85,
          px: 2,
          fontSize: { xs: 12, sm: 13 },
          fontWeight: 600,
          borderBottom: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  animation: 'radar-pulse 1.5s infinite'
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                National Blood Emergency Support
              </Typography>
              <Typography variant="caption" sx={{ display: { xs: 'none', md: 'inline' }, opacity: 0.9 }}>
                · 24/7 Toll-Free: <strong>104 / 108</strong> · Hospital Verified Live Network
              </Typography>
            </Stack>
            <Stack direction="row" gap={2} alignItems="center">
              <Button
                component="a"
                href="tel:104"
                size="small"
                startIcon={<PhoneCall size={13} />}
                sx={{
                  color: '#FFFFFF',
                  py: 0.2,
                  px: 1,
                  minHeight: 26,
                  bgcolor: 'rgba(255,255,255,0.18)',
                  borderRadius: 1.5,
                  fontSize: 12,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
                }}
              >
                Call 104 Emergency
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Sticky Header */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: 1100
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 74 }, justifyContent: 'space-between' }}>
            {/* Logo */}
            <Stack direction="row" alignItems="center" gap={1.5} component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                  position: 'relative'
                }}
              >
                <Droplet size={22} fill="#FFFFFF" />
              </Box>
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h5" sx={{ fontWeight: 850, letterSpacing: '-0.03em', color: '#0F172A', lineHeight: 1.1 }}>
                    RaktSaathi
                  </Typography>
                  <Chip
                    size="small"
                    label="VERIFIED"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 800,
                      bgcolor: '#FFF1F2',
                      color: '#E11D48',
                      border: '1px solid rgba(225,29,72,0.25)'
                    }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                  Verified Lifeline Network
                </Typography>
              </Box>
            </Stack>

            {/* Desktop Navigation Links */}
            {!isMobile && (
              <Stack direction="row" alignItems="center" gap={3}>
                <Typography component="a" href="#how-it-works" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  How It Works
                </Typography>
                <Typography component="a" href="#compatibility" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  Compatibility Matrix
                </Typography>
                <Typography component="a" href="#eligibility" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  Can I Donate?
                </Typography>
                <Typography component="a" href="#features" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  Features
                </Typography>
                <Typography component="a" href="#faq" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  FAQ
                </Typography>
              </Stack>
            )}

            {/* Desktop Actions */}
            {!isMobile ? (
              <Stack direction="row" gap={1.25} alignItems="center">
                <Button component={RouterLink} to="/login" variant="outlined" color="inherit" sx={{ fontWeight: 650, borderRadius: 2.5, px: 2.2 }}>
                  Sign in
                </Button>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  startIcon={<Zap size={16} />}
                  sx={{ borderRadius: 2.5, px: 2.5, fontWeight: 700 }}
                >
                  Join Network
                </Button>
              </Stack>
            ) : (
              <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
                <MenuIcon size={24} />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slotProps={{ paper: { sx: { width: '82%', maxWidth: 320, p: 2.5 } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', color: '#FFF' }}>
              <Droplet size={18} fill="#FFF" />
            </Box>
            <Typography variant="h6" fontWeight={800}>RaktSaathi</Typography>
          </Stack>
          <IconButton onClick={() => setMobileMenuOpen(false)}><X size={20} /></IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <ListItemButton component="a" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
            <ListItemText primary="How It Works" slotProps={{ primary: { fontWeight: 600 } }} />
          </ListItemButton>
          <ListItemButton component="a" href="#compatibility" onClick={() => setMobileMenuOpen(false)}>
            <ListItemText primary="Blood Compatibility" slotProps={{ primary: { fontWeight: 600 } }} />
          </ListItemButton>
          <ListItemButton component="a" href="#eligibility" onClick={() => setMobileMenuOpen(false)}>
            <ListItemText primary="Eligibility Quiz" slotProps={{ primary: { fontWeight: 600 } }} />
          </ListItemButton>
          <ListItemButton component="a" href="#features" onClick={() => setMobileMenuOpen(false)}>
            <ListItemText primary="Platform Pillars" slotProps={{ primary: { fontWeight: 600 } }} />
          </ListItemButton>
          <ListItemButton component="a" href="#faq" onClick={() => setMobileMenuOpen(false)}>
            <ListItemText primary="Frequently Asked Questions" slotProps={{ primary: { fontWeight: 600 } }} />
          </ListItemButton>
        </List>
        <Box sx={{ mt: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button component={RouterLink} to="/login" variant="outlined" fullWidth size="large" onClick={() => setMobileMenuOpen(false)}>
            Sign in
          </Button>
          <Button component={RouterLink} to="/register" variant="contained" fullWidth size="large" onClick={() => setMobileMenuOpen(false)}>
            Get started
          </Button>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #FFF1F2 0%, #F8FAFC 85%)',
          pt: { xs: 5, md: 9 },
          pb: { xs: 8, md: 12 }
        }}
      >
        {/* Decorative backdrop glow circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(225, 29, 72, 0.12) 0%, rgba(225, 29, 72, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 200,
            left: -150,
            width: 450,
            height: 450,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244, 63, 94, 0.08) 0%, rgba(244, 63, 94, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} gap={{ xs: 5, lg: 6 }} alignItems="center">
            {/* Left Hero Content */}
            <Stack gap={3} sx={{ flex: 1, maxWidth: { xs: '100%', lg: 640 } }}>
              <Box>
                <Chip
                  icon={<ShieldAlert size={14} color="#E11D48" />}
                  label="100% CLINICALLY VERIFIED · ZERO HOAXES"
                  sx={{
                    bgcolor: '#FFFFFF',
                    color: '#BE123C',
                    border: '1px solid rgba(225, 29, 72, 0.25)',
                    fontWeight: 750,
                    letterSpacing: '0.04em',
                    fontSize: 11.5,
                    boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)',
                    mb: 2.5
                  }}
                />
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 38, sm: 48, md: 58 },
                    fontWeight: 850,
                    lineHeight: 1.08,
                    letterSpacing: '-0.035em',
                    color: '#0F172A'
                  }}
                >
                  When every second counts, verified blood connects in{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      display: 'inline'
                    }}
                  >
                    minutes.
                  </Box>
                </Typography>
              </Box>

              <Typography
                variant="h6"
                sx={{
                  color: '#475569',
                  fontWeight: 400,
                  fontSize: { xs: 16, md: 19 },
                  lineHeight: 1.55
                }}
              >
                RaktSaathi bridges patients in critical need, voluntary donors, hospitals, and blood banks.
                Every request is authenticated by attending doctors to eliminate panic spam, while donor location coordinates remain strictly private.
              </Typography>

              {/* Action Buttons */}
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ pt: 1 }}>
                <Button
                  component={RouterLink}
                  to="/register?role=REQUESTER"
                  variant="contained"
                  size="large"
                  startIcon={<PlusCircle size={20} />}
                  sx={{
                    py: 1.5,
                    px: 3.2,
                    fontSize: 16,
                    fontWeight: 750,
                    borderRadius: 3
                  }}
                >
                  Request Blood Urgently
                </Button>
                <Button
                  component={RouterLink}
                  to="/register?role=DONOR"
                  variant="outlined"
                  size="large"
                  startIcon={<Heart size={20} color="#E11D48" />}
                  sx={{
                    py: 1.5,
                    px: 3,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 3,
                    borderColor: 'rgba(15, 23, 42, 0.2)',
                    color: '#0F172A',
                    bgcolor: '#FFFFFF',
                    '&:hover': { borderColor: '#E11D48', bgcolor: '#FFF1F2' }
                  }}
                >
                  Be a Lifesaver (Donate)
                </Button>
              </Stack>

              {/* Trust Pillars Strip */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                gap={{ xs: 1.5, sm: 3 }}
                sx={{
                  pt: 2.5,
                  borderTop: '1px solid',
                  borderColor: 'rgba(15, 23, 42, 0.08)'
                }}
              >
                <Stack direction="row" alignItems="center" gap={1}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Typography variant="body2" fontWeight={650} color="#334155">
                    Hospital Gatekept
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Lock size={18} color="#3B82F6" />
                  <Typography variant="body2" fontWeight={650} color="#334155">
                    Zero GPS Coordinate Leak
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Sparkles size={18} color="#E11D48" />
                  <Typography variant="body2" fontWeight={650} color="#334155">
                    Blood Bank Stock Sync
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            {/* Right Hero Interactive Simulation Card */}
            <Box sx={{ flex: 1, width: '100%', maxWidth: { xs: 460, lg: 520 } }}>
              <Card
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: 5,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(225, 29, 72, 0.2)',
                  boxShadow: '0 20px 45px -10px rgba(225, 29, 72, 0.15), 0 10px 20px -5px rgba(15, 23, 42, 0.05)',
                  position: 'relative'
                }}
              >
                {/* Live Banner */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#E11D48', animation: 'radar-pulse 1.8s infinite' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#E11D48', letterSpacing: '0.05em' }}>
                      LIVE DISTRESS BROADCAST
                    </Typography>
                  </Stack>
                  <Chip size="small" label="URGENT" color="error" sx={{ fontWeight: 800, height: 22, fontSize: 11 }} />
                </Stack>

                {/* Request Details Simulation */}
                <Stack gap={2}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          CODE: RS-MUM-8924
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0F172A', mt: 0.25 }}>
                          Patient: Ananya Rao (34 yrs)
                        </Typography>
                        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
                          <Hospital size={14} color="#64748B" />
                          <Typography variant="body2" color="text.secondary">
                            Lilavati Hospital & Research Centre, Mumbai
                          </Typography>
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 2.5,
                          bgcolor: '#FFF1F2',
                          border: '1px solid rgba(225,29,72,0.25)',
                          textAlign: 'center',
                          minWidth: 62
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} color="#E11D48" sx={{ display: 'block', lineHeight: 1 }}>
                          NEED
                        </Typography>
                        <Typography variant="h5" fontWeight={900} color="#BE123C">
                          O+
                        </Typography>
                        <Typography variant="caption" fontWeight={600} color="#E11D48">
                          2 Units
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Verification Status Pill */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25
                    }}
                  >
                    <ShieldCheck size={20} color="#059669" />
                    <Box>
                      <Typography variant="body2" fontWeight={750} color="#065F46">
                        Verified by Dr. V. Deshmukh (Attending CMO)
                      </Typography>
                      <Typography variant="caption" color="#047857">
                        Prescription and bed admission confirmed · Authenticated 8 mins ago
                      </Typography>
                    </Box>
                  </Box>

                  {/* Live Responses Progress */}
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        Real-time Donor Responses
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="#E11D48">
                        2 Pledged · 1 Blood Bank Unit Allocated
                      </Typography>
                    </Stack>

                    <Stack gap={1}>
                      <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#E11D48', fontSize: 12, fontWeight: 700 }}>AK</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={650}>Arjun K. (O+)</Typography>
                            <Typography variant="caption" color="text.secondary">Accepted · ≈ 2.5 km away (Bandra)</Typography>
                          </Box>
                        </Stack>
                        <Chip size="small" label="On the way" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                      </Box>

                      <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#3B82F6' }}>
                            <Building2 size={16} />
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={650}>Red Cross Blood Centre</Typography>
                            <Typography variant="caption" color="text.secondary">Allocated 1 Unit (O+) from stock</Typography>
                          </Box>
                        </Stack>
                        <Chip size="small" label="Dispatched" color="info" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                      </Box>
                    </Stack>
                  </Box>

                  {/* Simulation Footer Button */}
                  <Button
                    component={RouterLink}
                    to="/register?role=DONOR"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 0.5, borderRadius: 2.5, fontWeight: 700 }}
                  >
                    Respond to Nearby Emergency Requests
                  </Button>
                </Stack>
              </Card>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Impact Metric Strip */}
      <Box sx={{ bgcolor: '#0F172A', color: '#FFFFFF', py: { xs: 5, md: 6 } }} id="impact">
        <Container maxWidth="lg">
          <Responsive cols={{ xs: 2, md: 4 }} gap={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 850, color: '#F43F5E', fontSize: { xs: 34, md: 46 } }}>
                14 min
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, mt: 0.5 }}>
                Average Donor Response Time
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 850, color: '#38BDF8', fontSize: { xs: 34, md: 46 } }}>
                100%
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, mt: 0.5 }}>
                Hospital Verified Clinical Requests
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 850, color: '#34D399', fontSize: { xs: 34, md: 46 } }}>
                0 km²
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, mt: 0.5 }}>
                Raw Coordinate Leaks (Guaranteed Privacy)
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 850, color: '#FBBF24', fontSize: { xs: 34, md: 46 } }}>
                24 / 7
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, mt: 0.5 }}>
                Real-Time Hospital & Bank Dispatch
              </Typography>
            </Box>
          </Responsive>
        </Container>
      </Box>

      {/* Interactive Blood Compatibility Matrix Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FFFFFF' }} id="compatibility">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 740, mx: 'auto', mb: { xs: 5, md: 7 } }}>
            <Chip label="INTERACTIVE CLINICAL TOOL" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, color: '#0F172A' }}>
              Blood Group Compatibility Matrix
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontSize: { xs: 15, md: 17 } }}>
              Select any blood group to instantly inspect red blood cell compatibility for safe transfusions and donations.
            </Typography>
          </Box>

          {/* Blood Group Selectors */}
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1.5, mb: 5 }}>
            {BLOOD_GROUPS.map((g) => {
              const active = selectedGroup === g;
              return (
                <Button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  variant={active ? 'contained' : 'outlined'}
                  sx={{
                    minWidth: 84,
                    height: 52,
                    borderRadius: 3,
                    fontSize: 18,
                    fontWeight: 800,
                    borderColor: active ? 'primary.main' : '#E2E8F0',
                    color: active ? '#FFFFFF' : '#334155',
                    bgcolor: active ? undefined : '#F8FAFC',
                    boxShadow: active ? '0 8px 20px rgba(225, 29, 72, 0.35)' : 'none',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: active ? undefined : '#FFF1F2'
                    }
                  }}
                >
                  {bloodLabel(g)}
                </Button>
              );
            })}
          </Box>

          {/* Compatibility Display Cards */}
          <Responsive cols={{ xs: 1, md: 2 }} gap={3}>
            {/* Can Receive From */}
            <Card
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                border: '1px solid #E2E8F0',
                bgcolor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center' }}>
                    <Droplet size={22} fill="#2563EB" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      RECIPIENT COMPATIBILITY
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#0F172A">
                      {bloodLabel(selectedGroup)} can RECEIVE from:
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  In emergency transfusions, a patient with <strong>{bloodLabel(selectedGroup)}</strong> blood can safely receive red blood cells from these donor groups:
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                  {compatibleDonors.map((donorGroup) => (
                    <Chip
                      key={donorGroup}
                      label={bloodLabel(donorGroup)}
                      sx={{
                        fontSize: 16,
                        fontWeight: 800,
                        py: 2.2,
                        px: 1,
                        borderRadius: 2.5,
                        bgcolor: '#FFFFFF',
                        border: '2px solid #2563EB',
                        color: '#1D4ED8'
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #E2E8F0' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Info size={14} /> Total {compatibleDonors.length} compatible donor group(s) available.
                </Typography>
              </Box>
            </Card>

            {/* Can Donate To */}
            <Card
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                border: '1px solid rgba(225, 29, 72, 0.25)',
                bgcolor: '#FFF1F2',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: '#FFE4E6', color: '#E11D48', display: 'grid', placeItems: 'center' }}>
                    <Heart size={22} fill="#E11D48" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="#BE123C" fontWeight={750}>
                      DONOR POTENTIAL
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="#9F1239">
                      {bloodLabel(selectedGroup)} can DONATE to:
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant="body2" color="#4C0519" sx={{ mb: 2.5 }}>
                  A healthy voluntary donor with <strong>{bloodLabel(selectedGroup)}</strong> blood can potentially save lives across these patient groups:
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                  {compatibleRecipients.map((recipGroup) => (
                    <Chip
                      key={recipGroup}
                      label={bloodLabel(recipGroup)}
                      sx={{
                        fontSize: 16,
                        fontWeight: 800,
                        py: 2.2,
                        px: 1,
                        borderRadius: 2.5,
                        bgcolor: '#FFFFFF',
                        border: '2px solid #E11D48',
                        color: '#BE123C'
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(225, 29, 72, 0.15)' }}>
                <Typography variant="caption" color="#9F1239" fontWeight={650}>
                  {currentGroupFact.tag} — {currentGroupFact.description}
                </Typography>
              </Box>
            </Card>
          </Responsive>

          <Alert
            severity="info"
            icon={<ShieldCheck size={20} />}
            sx={{
              mt: 4,
              borderRadius: 3,
              bgcolor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              color: '#0369A1'
            }}
          >
            <strong>Clinical Safety Protocol:</strong> This tool demonstrates ABO and Rh(D) red cell compatibility guidelines.
            Final cross-matching, antibody screening, and transfusion compatibility are always supervised by hospital clinical laboratories.
          </Alert>
        </Container>
      </Box>

      {/* How a Request Moves (Step by Step Pipeline) */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }} id="how-it-works">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 6, md: 8 } }}>
            <Chip label="THE LIFESAVING PROTOCOL" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, color: '#0F172A' }}>
              How a Request Moves Through the Network
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontSize: { xs: 15, md: 17 } }}>
              Four authenticated stages ensure maximum speed while keeping safety, medical supervision, and fraud-prevention uncompromised.
            </Typography>
          </Box>

          <Responsive cols={{ xs: 1, sm: 2, lg: 4 }} gap={3}>
            {STEPS.map((s, idx) => (
              <Card
                key={s.num}
                sx={{
                  p: 3.5,
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid #E2E8F0',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        color: 'rgba(225, 29, 72, 0.25)',
                        lineHeight: 1
                      }}
                    >
                      {s.num}
                    </Typography>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: '#FFF1F2',
                        color: 'primary.main'
                      }}
                    >
                      {s.icon}
                    </Box>
                  </Stack>

                  <Chip
                    size="small"
                    label={s.actor}
                    sx={{
                      mb: 1.25,
                      fontWeight: 700,
                      fontSize: 11,
                      bgcolor: '#F1F5F9',
                      color: '#475569'
                    }}
                  />
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#0F172A', mb: 1 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.desc}
                  </Typography>
                </Box>

                {idx < STEPS.length - 1 && (
                  <Box
                    sx={{
                      pt: 2.5,
                      display: { xs: 'none', lg: 'flex' },
                      justifyContent: 'flex-end',
                      color: 'primary.main'
                    }}
                  >
                    <ArrowRight size={18} />
                  </Box>
                )}
              </Card>
            ))}
          </Responsive>
        </Container>
      </Box>

      {/* Interactive "Can I Donate?" Eligibility Quiz */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FFFFFF' }} id="eligibility">
        <Container maxWidth="lg">
          <Card
            sx={{
              p: { xs: 3.5, sm: 6 },
              borderRadius: 5,
              background: 'linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%)',
              border: '1px solid rgba(225, 29, 72, 0.25)',
              boxShadow: '0 20px 40px -15px rgba(225, 29, 72, 0.1)'
            }}
          >
            <Stack direction={{ xs: 'column', lg: 'row' }} gap={{ xs: 4, lg: 6 }} alignItems="center">
              {/* Left Quiz Form */}
              <Box sx={{ flex: 1.2 }}>
                <Chip label="QUICK 15-SECOND CHECK" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
                <Typography variant="h3" sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 850, color: '#0F172A', mb: 1 }}>
                  Can You Donate Blood Today?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
                  Check the basic donor criteria below to see if you can step up as a registered voluntary lifesaver.
                </Typography>

                <Stack gap={2}>
                  {/* Q1: Age */}
                  <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF' }}>
                    <Box sx={{ pr: 2 }}>
                      <Typography variant="subtitle2" fontWeight={750} color="#0F172A">
                        1. Are you aged between 18 and 65 years?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Legal voluntary donor age limit in clinical guidelines
                      </Typography>
                    </Box>
                    <Switch checked={quizAge} onChange={(e) => setQuizAge(e.target.checked)} color="primary" />
                  </Card>

                  {/* Q2: Weight */}
                  <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF' }}>
                    <Box sx={{ pr: 2 }}>
                      <Typography variant="subtitle2" fontWeight={750} color="#0F172A">
                        2. Is your body weight at least 45 kg (100 lbs)?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ensures safe donation volume without physiological strain
                      </Typography>
                    </Box>
                    <Switch checked={quizWeight} onChange={(e) => setQuizWeight(e.target.checked)} color="primary" />
                  </Card>

                  {/* Q3: Interval */}
                  <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF' }}>
                    <Box sx={{ pr: 2 }}>
                      <Typography variant="subtitle2" fontWeight={750} color="#0F172A">
                        3. Has it been ≥90 days since your last whole-blood donation?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allows complete red blood cell and iron regeneration
                      </Typography>
                    </Box>
                    <Switch checked={quizInterval} onChange={(e) => setQuizInterval(e.target.checked)} color="primary" />
                  </Card>

                  {/* Q4: Health */}
                  <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF' }}>
                    <Box sx={{ pr: 2 }}>
                      <Typography variant="subtitle2" fontWeight={750} color="#0F172A">
                        4. Feeling healthy, well, and free of fever or infections today?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Vital signs and hemoglobin will be verified at hospital
                      </Typography>
                    </Box>
                    <Switch checked={quizHealth} onChange={(e) => setQuizHealth(e.target.checked)} color="primary" />
                  </Card>
                </Stack>
              </Box>

              {/* Right Quiz Outcome Card */}
              <Box sx={{ flex: 0.9, width: '100%' }}>
                <Card
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 4,
                    bgcolor: isEligible ? '#ECFDF5' : '#FFFBEB',
                    border: '2px solid',
                    borderColor: isEligible ? '#10B981' : '#F59E0B'
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      mx: 'auto',
                      mb: 2,
                      bgcolor: isEligible ? '#D1FAE5' : '#FEF3C7',
                      color: isEligible ? '#059669' : '#D97706'
                    }}
                  >
                    {isEligible ? <Award size={36} /> : <AlertTriangle size={36} />}
                  </Box>

                  <Typography variant="h5" fontWeight={850} color={isEligible ? '#065F46' : '#92400E'} sx={{ mb: 1 }}>
                    {isEligible ? 'You Are Eligible to Donate!' : 'Temporarily Ineligible'}
                  </Typography>

                  <Typography variant="body2" color={isEligible ? '#047857' : '#B45309'} sx={{ mb: 3 }}>
                    {isEligible
                      ? 'One single whole-blood donation can save up to three lives in emergency surgical or pediatric care. Register today so we can reach you when someone near you needs your blood group.'
                      : 'Blood donation protocols strictly prioritize donor health and recipient safety. Once your interval passes or health recovers, you can donate again!'}
                  </Typography>

                  <Button
                    component={RouterLink}
                    to="/register?role=DONOR"
                    variant="contained"
                    fullWidth
                    size="large"
                    color={isEligible ? 'primary' : 'inherit'}
                    sx={{ borderRadius: 3, fontWeight: 750, py: 1.5 }}
                  >
                    {isEligible ? 'Register as a Donor Now' : 'Join Network for Future Eligibility'}
                  </Button>
                </Card>
              </Box>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Stakeholder Tabs (Patients, Donors, Hospitals, Blood Banks) */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 5, md: 7 } }}>
            <Chip label="TAILORED WORKFLOWS" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, color: '#0F172A' }}>
              Built for the Entire Healthcare Ecosystem
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontSize: { xs: 15, md: 17 } }}>
              Every participant plays a coordinated role with customized dashboards, notifications, and security permissions.
            </Typography>
          </Box>

          {/* Stakeholder Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 4,
              '& .MuiTabs-flexContainer': { justifyContent: { sm: 'center' } },
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: 15,
                textTransform: 'none',
                minHeight: 48,
                borderRadius: 3,
                mr: 1,
                px: 2.5
              }
            }}
          >
            {STAKEHOLDERS.map((stk) => (
              <Tab key={stk.label} label={stk.label} />
            ))}
          </Tabs>

          {/* Active Stakeholder View */}
          {STAKEHOLDERS.map((stk, index) => {
            if (activeTab !== index) return null;
            return (
              <Card
                key={stk.label}
                sx={{
                  p: { xs: 3.5, md: 5 },
                  borderRadius: 5,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.08)'
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} gap={{ xs: 3, md: 5 }} alignItems="center">
                  <Box sx={{ flex: 1.2 }}>
                    <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ mb: 1.5, fontSize: { xs: 22, md: 28 } }}>
                      {stk.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                      {stk.desc}
                    </Typography>

                    <Stack gap={1.5} sx={{ mb: 4 }}>
                      {stk.points.map((pt) => (
                        <Stack key={pt} direction="row" alignItems="flex-start" gap={1.25}>
                          <CheckCircle2 size={18} color="#10B981" style={{ marginTop: 3, flexShrink: 0 }} />
                          <Typography variant="body2" color="#334155" fontWeight={600}>
                            {pt}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>

                    <Button
                      component={RouterLink}
                      to={`/register?role=${stk.role}`}
                      variant="contained"
                      size="large"
                      endIcon={<ArrowRight size={18} />}
                      sx={{ borderRadius: 2.5, fontWeight: 750, px: 3 }}
                    >
                      {stk.cta}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      flex: 0.8,
                      width: '100%',
                      p: 4,
                      borderRadius: 4,
                      background: 'linear-gradient(135deg, #FFF1F2 0%, #F8FAFC 100%)',
                      border: '1px solid rgba(225, 29, 72, 0.15)',
                      textAlign: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 3.5,
                        display: 'grid',
                        placeItems: 'center',
                        mx: 'auto',
                        mb: 2,
                        bgcolor: '#FFFFFF',
                        color: 'primary.main',
                        boxShadow: '0 8px 18px rgba(225, 29, 72, 0.15)'
                      }}
                    >
                      {index === 0 ? <UserRound size={36} /> : index === 1 ? <Droplet size={36} /> : index === 2 ? <Hospital size={36} /> : <Building2 size={36} />}
                    </Box>
                    <Typography variant="h6" fontWeight={800} color="#0F172A">
                      {stk.label} Workspace
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Optimized for both mobile and desktop screens with real-time socket refresh.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            );
          })}
        </Container>
      </Box>

      {/* Platform Pillars / Features */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FFFFFF' }} id="features">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: { xs: 6, md: 8 } }}>
            <Chip label="CORE INFRASTRUCTURE" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, color: '#0F172A' }}>
              Engineered for Speed, Trust, and Privacy
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontSize: { xs: 15, md: 17 } }}>
              The six fundamental pillars that make RaktSaathi the trusted platform for life-or-death situations.
            </Typography>
          </Box>

          <Responsive cols={{ xs: 1, sm: 2, md: 3 }} gap={3}>
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                sx={{
                  p: 3.5,
                  borderRadius: 4,
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 14px 28px -6px rgba(225, 29, 72, 0.12)',
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#FFF1F2',
                      color: 'primary.main'
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Chip size="small" label={f.tag} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#F1F5F9', color: '#475569' }} />
                </Stack>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: '#0F172A' }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {f.desc}
                </Typography>
              </Card>
            ))}
          </Responsive>
        </Container>
      </Box>

      {/* Frequently Asked Questions (FAQ) */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }} id="faq">
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
            <Chip label="GOT QUESTIONS?" color="primary" size="small" sx={{ fontWeight: 750, mb: 1.5 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 850, color: '#0F172A' }}>
              Frequently Asked Questions
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontSize: { xs: 15, md: 17 } }}>
              Everything you need to know about verification, privacy, and how RaktSaathi operates.
            </Typography>
          </Box>

          <Stack gap={2}>
            {FAQS.map((faq, idx) => (
              <Accordion
                key={faq.q}
                defaultExpanded={idx === 0}
                sx={{
                  borderRadius: '16px !important',
                  border: '1px solid #E2E8F0',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  overflow: 'hidden'
                }}
              >
                <AccordionSummary expandIcon={<ChevronDown size={20} />} sx={{ px: 3, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight={750} color="#0F172A">
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Urgent Emergency Call-To-Action Banner */}
      <Box sx={{ bgcolor: '#FFFFFF', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Card
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 5,
              background: 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
              color: '#FFFFFF',
              boxShadow: '0 20px 45px -10px rgba(225, 29, 72, 0.4)',
              textAlign: { xs: 'center', md: 'left' }
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" gap={4}>
              <Box sx={{ maxWidth: 620 }}>
                <Chip
                  icon={<Zap size={14} color="#FFF" />}
                  label="EVERY SECOND COUNTS"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: 11,
                    mb: 2
                  }}
                />
                <Typography variant="h3" fontWeight={850} sx={{ color: '#FFFFFF', fontSize: { xs: 26, md: 36 }, lineHeight: 1.2, mb: 1.5 }}>
                  Facing a medical emergency or ready to stand on call?
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: 15, md: 17 } }}>
                  Create an authenticated request in under 60 seconds, or register as a voluntary lifesaver to receive emergency alerts near you.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  component={RouterLink}
                  to="/register?role=REQUESTER"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: '#FFFFFF',
                    color: '#BE123C',
                    fontWeight: 800,
                    px: 3.5,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    '&:hover': { bgcolor: '#FFF1F2' }
                  }}
                >
                  Request Blood
                </Button>
                <Button
                  component={RouterLink}
                  to="/register?role=DONOR"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: '#FFFFFF',
                    fontWeight: 750,
                    px: 3.5,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: '#FFFFFF' }
                  }}
                >
                  Join as Donor
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Modern Comprehensive Footer */}
      <Box sx={{ bgcolor: '#0F172A', color: '#94A3B8', pt: 8, pb: 'calc(32px + env(safe-area-inset-bottom))' }}>
        <Container maxWidth="lg">
          <Responsive cols={{ xs: 1, sm: 2, md: 4 }} gap={4} sx={{ mb: 6 }}>
            {/* Brand Column */}
            <Box>
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: '#E11D48', color: '#FFF' }}>
                  <Droplet size={20} fill="#FFF" />
                </Box>
                <Typography variant="h6" fontWeight={850} color="#FFFFFF">
                  RaktSaathi
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 2 }}>
                Verified emergency blood coordination platform connecting distress requests, voluntary donors, hospitals, and licensed blood banks.
              </Typography>
              <Stack direction="row" alignItems="center" gap={1}>
                <Chip size="small" label="Non-Profit Initiative" sx={{ bgcolor: '#1E293B', color: '#CBD5E1', fontSize: 11 }} />
                <Chip size="small" label="Open Healthcare" sx={{ bgcolor: '#1E293B', color: '#CBD5E1', fontSize: 11 }} />
              </Stack>
            </Box>

            {/* Quick Links */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#FFFFFF" sx={{ mb: 2 }}>
                Quick Navigation
              </Typography>
              <Stack gap={1}>
                <Typography component="a" href="#how-it-works" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  How It Works
                </Typography>
                <Typography component="a" href="#compatibility" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Compatibility Matrix
                </Typography>
                <Typography component="a" href="#eligibility" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Donor Eligibility
                </Typography>
                <Typography component="a" href="#features" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Security & Fraud Shield
                </Typography>
                <Typography component="a" href="#faq" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Frequently Asked Questions
                </Typography>
              </Stack>
            </Box>

            {/* Stakeholder Portals */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#FFFFFF" sx={{ mb: 2 }}>
                Stakeholder Portals
              </Typography>
              <Stack gap={1}>
                <Typography component={RouterLink} to="/register?role=REQUESTER" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Patient Distress Portal
                </Typography>
                <Typography component={RouterLink} to="/register?role=DONOR" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Voluntary Donor Registration
                </Typography>
                <Typography component={RouterLink} to="/register?role=HOSPITAL" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Hospital Medical Desk
                </Typography>
                <Typography component={RouterLink} to="/register?role=BLOODBANK" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Licensed Blood Bank Registry
                </Typography>
                <Typography component={RouterLink} to="/login" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#FFFFFF' } }}>
                  Sign in to Workspace
                </Typography>
              </Stack>
            </Box>

            {/* Emergency & Support */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#FFFFFF" sx={{ mb: 2 }}>
                Emergency Contacts
              </Typography>
              <Stack gap={1.25}>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    NATIONAL BLOOD HELPLINE
                  </Typography>
                  <Typography variant="body2" color="#FFFFFF" fontWeight={750}>
                    104 / 108 (24x7 Toll Free)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    AMBULANCE DISPATCH
                  </Typography>
                  <Typography variant="body2" color="#FFFFFF" fontWeight={750}>
                    102 (Pan-India)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#64748B" fontWeight={700}>
                    CENTRAL INVENTORY
                  </Typography>
                  <Typography variant="body2" color="#FFFFFF" fontWeight={750}>
                    eRaktKosh Regional Network
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Responsive>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 4 }} />

          {/* Legal / Medical Disclaimer */}
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', lineHeight: 1.7, mb: 2 }}>
            <strong>Clinical Safety Disclaimer:</strong> RaktSaathi is a healthcare coordination platform and matching facilitator.
            It does not practice medicine, conduct clinical compatibility testing, or replace licensed blood transfusion protocols.
            All medical screenings, hemoglobin checks, infectious disease markers, and cross-matching remain the exclusive clinical responsibility of certified hospital doctors and licensed blood bank pathologists.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              © {new Date().getFullYear()} RaktSaathi. Designed for lifesaving healthcare workflows.
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Built with precision & care.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
