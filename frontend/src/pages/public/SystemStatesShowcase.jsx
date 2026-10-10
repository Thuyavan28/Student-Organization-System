import { useState } from 'react';
import {
  LuSparkles,
  LuLoader,
  LuInbox,
  LuCircleCheck,
  LuTriangleAlert,
  LuWifiOff,
  LuShieldAlert,
  LuSplit,
  LuFileWarning,
  LuClock,
  LuRefreshCw,
  LuRotateCcw,
  LuCopy,
  LuExternalLink,
  LuCheck,
} from 'react-icons/lu';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Badge,
  Input,
  PageLoader,
  EmptyState,
  SuccessScreen,
  ErrorState,
  PermissionDenied,
  PartialDataBanner,
  DataValue,
  FormErrorSummary,
} from '../../components/ui';
import { useToast } from '../../context/ToastContext';

export default function SystemStatesShowcase() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('loading');

  // Screen 1: Loading test state
  const [loadingActive, setLoadingActive] = useState(false);
  const [forceSlowWarning, setForceSlowWarning] = useState(false);

  // Screen 2: Empty preset state
  const [emptyPreset, setEmptyPreset] = useState('first-use');
  const [undoMessage, setUndoMessage] = useState(null);

  // Screen 4: Error retry simulation state
  const [errorSimCount, setErrorSimCount] = useState(0);

  // Screen 6: Permission type state
  const [permType, setPermType] = useState('device');
  const [devicePermType, setDevicePermType] = useState('Camera');

  // Screen 7: Partial data simulation
  const [partialDataError, setPartialDataError] = useState(true);

  // Screen 8: Form validation simulation state
  const [formFields, setFormFields] = useState({
    eventName: '',
    ticketPrice: '',
    eventDate: '',
    contactEmail: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  const screens = [
    { id: 'loading', name: '1. First Loading Screen', icon: LuLoader, badge: 'Skeleton & Anti-flicker' },
    { id: 'empty', name: '2. Empty Screen', icon: LuInbox, badge: '3 Presets & Undo' },
    { id: 'success', name: '3. Success Screen', icon: LuCircleCheck, badge: 'Milestones & Ref #' },
    { id: 'error', name: '4. Error Screen & Retry', icon: LuTriangleAlert, badge: 'Smart 3-Retry Limits' },
    { id: 'no-internet', name: '5. No-Internet Screen', icon: LuWifiOff, badge: 'Auto-recovery & Ping' },
    { id: 'permission', name: '6. Permission Denied', icon: LuShieldAlert, badge: 'Device & 403 Role' },
    { id: 'partial', name: '7. Partial Data Screen', icon: LuSplit, badge: 'Safe Fallbacks & Banners' },
    { id: 'validation', name: '8. Form Validation State', icon: LuFileWarning, badge: 'Jump-Links & Inline' },
    { id: 'session', name: '9. Session Expired', icon: LuClock, badge: '401 & Idle Countdown' },
  ];

  // Form validation handler
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formFields.eventName.trim()) {
      newErrors.eventName = 'Event name is required and cannot be empty.';
    }
    if (!formFields.ticketPrice || Number(formFields.ticketPrice) <= 0) {
      newErrors.ticketPrice = 'Enter a valid ticket price greater than 0.';
    }
    if (!formFields.eventDate) {
      newErrors.eventDate = 'Choose an upcoming event date.';
    }
    if (!formFields.contactEmail || !formFields.contactEmail.includes('@')) {
      newErrors.contactEmail = 'Provide a valid university email address.';
    }

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      toast.success('Form validation passed! All fields are valid.');
    } else {
      toast.error('Form contains validation errors. See summary.');
    }
  };

  const triggerSessionExpired = () => {
    window.dispatchEvent(
      new CustomEvent('session-expired', {
        detail: { returnUrl: '/system-states' },
      }),
    );
  };

  const triggerSessionWarning = () => {
    window.dispatchEvent(new CustomEvent('session-warning-simulate'));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-10 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-bold text-indigo-200">
              <LuSparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>Mandatory Website States Suite</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">System Screens & States</h1>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore and test the 9 core UX error, loading, empty, and resilience states built for the
              ClubFlow Student Organization platform.
            </p>
          </div>
        </div>
      </div>

      {/* Screen Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {screens.map((s) => {
          const Icon = s.icon;
          const isSelected = activeTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-2'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`h-5 w-5 mb-1.5 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`} />
              <span className="text-[11px] font-bold line-clamp-1">{s.name.split('. ')[1]}</span>
              <span className={`text-[9px] mt-0.5 line-clamp-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                {s.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Screen 1: First Loading Screen */}
      {activeTab === 'loading' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 1: First Loading Screen"
            subtitle="Matches layout shape, delays skeleton by 150ms to prevent flicker, and shows an 8.5s slow connection recovery hint."
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setForceSlowWarning(!forceSlowWarning)}
                  icon={LuRefreshCw}
                >
                  {forceSlowWarning ? 'Normal Load' : 'Force 8.5s Timeout Hint'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setLoadingActive(true);
                    setTimeout(() => setLoadingActive(false), 2500);
                  }}
                  icon={LuLoader}
                >
                  Simulate 2.5s Route Load
                </Button>
              </div>
            }
          />
          <CardBody>
            {loadingActive ? (
              <div className="rounded-2xl border border-slate-100 p-4">
                <PageLoader message="Fetching organization data..." forceSlowWarning={forceSlowWarning} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6">
                  <p className="text-xs font-semibold text-slate-500 mb-3">Live Skeleton Layout Preview:</p>
                  <PageLoader
                    message="Initial application launch..."
                    forceSlowWarning={forceSlowWarning}
                    onRetry={() => toast.info('Retry clicked from loading state')}
                    onCancel={() => toast.info('Cancelled loading state')}
                  />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Screen 2: Empty Screen */}
      {activeTab === 'empty' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 2: Empty Screen"
            subtitle="Distinguishes first-use (teach and invite), no-results (adjust search/filters), and cleared (confirm done + optional undo)."
            actions={
              <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                {['first-use', 'no-results', 'cleared'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setEmptyPreset(p);
                      setUndoMessage(null);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-colors ${
                      emptyPreset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            }
          />
          <CardBody>
            {undoMessage && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between">
                <span>{undoMessage}</span>
                <Button size="xs" variant="ghost" onClick={() => setUndoMessage(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            {emptyPreset === 'first-use' && (
              <EmptyState
                preset="first-use"
                title="No events created yet"
                message="Start organizing campus workshops, hackathons, and gatherings by launching your first club event."
                action={<Button icon={LuSparkles}>Create First Event</Button>}
              />
            )}

            {emptyPreset === 'no-results' && (
              <EmptyState
                preset="no-results"
                title="No matching student bookings found"
                message="No bookings match 'Physics Workshop' under the 'Confirmed' status."
                onResetFilters={() => toast.info('Filters cleared back to default.')}
              />
            )}

            {emptyPreset === 'cleared' && (
              <EmptyState
                preset="cleared"
                title="All check-in tickets processed"
                message="Every student in this session has been checked in or approved."
                onUndo={() => {
                  setUndoMessage('Restored previous unchecked status for last ticket (#TK-4029).');
                  toast.success('Undone last action!');
                }}
              />
            )}
          </CardBody>
        </Card>
      )}

      {/* Screen 3: Success Screen */}
      {activeTab === 'success' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 3: Success Confirmation Screen"
            subtitle="Celebratory green halo badge, copyable reference token, itemized key details, and primary/secondary next steps."
          />
          <CardBody>
            <SuccessScreen
              title="Order #ORD-8492 Confirmed!"
              subtitle="Your merchandise reservation was recorded successfully. A confirmation receipt has been sent to your student email."
              referenceId="ORD-8492-COLLEGE"
              referenceLabel="Order Reference ID"
              details={[
                { label: 'Item Purchased', value: 'Skyline Premium Navy Hoodie (L)' },
                { label: 'Total Paid', value: '$45.00' },
                { label: 'Pickup Location', value: 'Student Union Room 204' },
                { label: 'Collection Hours', value: 'Monday – Friday, 10:00 AM – 4:00 PM' },
              ]}
              primaryAction={{
                label: 'View Order in Profile',
                to: '/me/orders',
                icon: LuExternalLink,
              }}
              secondaryAction={{
                label: 'Back to Club Shop',
                to: '/shop',
              }}
            />
          </CardBody>
        </Card>
      )}

      {/* Screen 4: Error Screen (with Retry) */}
      {activeTab === 'error' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 4: Error Screen & Smart Retry"
            subtitle="Features Retry loading state, non-accusatory copy, collapsible diagnostics, and shifts message after 3 failed retries."
            actions={
              <Button size="sm" variant="secondary" onClick={() => setErrorSimCount(0)} icon={LuRotateCcw}>
                Reset Retry Count (Current: {errorSimCount})
              </Button>
            }
          />
          <CardBody className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Full-Page / Container Error Variant:</h4>
              <ErrorState
                title="Unable to load financial ledger"
                message="We encountered an issue syncing recent club expense transactions with the banking gateway."
                code="ERR_GATEWAY_TIMEOUT_504"
                onRetry={async () => {
                  setErrorSimCount((c) => c + 1);
                  await new Promise((r) => setTimeout(r, 800));
                  toast.info(`Retry #${errorSimCount + 1} attempted.`);
                }}
              />
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700">Inline Component Error Variant (Isolated Widget Failure):</h4>
              <ErrorState
                inline
                message="Failed to load real-time attendee weather widget."
                onRetry={async () => {
                  await new Promise((r) => setTimeout(r, 600));
                  toast.success('Widget reloaded successfully!');
                }}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Screen 5: No-Internet Screen */}
      {activeTab === 'no-internet' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 5: No-Internet Screen"
            subtitle="Listens to window online/offline events, displays persistent offline warning banner, ping retry, and auto-recovery notice."
          />
          <CardBody className="space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <LuWifiOff className="h-5 w-5 text-amber-600" />
                <span>Simulated Offline Banner Preview</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                When offline, ClubFlow automatically avoids disrupting your view with a generic server crash.
                Instead, it presents cached data and informs you via a non-intrusive alert banner:
              </p>
              <div className="rounded-xl bg-amber-600 p-3 text-xs text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <LuWifiOff className="h-4 w-4 animate-pulse" />
                  <span>You&apos;re currently offline. Showing cached information. Check your internet connection.</span>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('Checking network connectivity...')}
                  className="rounded-lg bg-amber-700/90 px-2.5 py-1 text-xs font-bold hover:bg-amber-800"
                >
                  Try again
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                <LuWifiOff className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Network Disconnected</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                ClubFlow cannot communicate with the server. Please check your Wi-Fi or mobile data network.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button size="sm" icon={LuRefreshCw} onClick={() => toast.info('Pinging connection...')}>
                  Check Connection
                </Button>
                <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Screen 6: Permission Denied Screen */}
      {activeTab === 'permission' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 6: Permission Denied Screen"
            subtitle="Handles both Hardware Device blocks (camera/mic with step-by-step unblock instructions + manual token fallback) and Account 403 blocks."
            actions={
              <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPermType('device')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                    permType === 'device' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Device Hardware Permission
                </button>
                <button
                  type="button"
                  onClick={() => setPermType('account')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                    permType === 'account' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Account / Role 403 Forbidden
                </button>
              </div>
            }
          />
          <CardBody>
            {permType === 'device' ? (
              <PermissionDenied
                type="device"
                deviceType={devicePermType}
                onReRequest={() => toast.info('Browser system prompt re-requested for camera.')}
                onFallback={() => toast.info('Switched to manual ticket entry form!')}
                fallbackLabel="Enter 12-digit ticket code manually"
              />
            ) : (
              <PermissionDenied
                type="account"
                requiredRole="TREASURER"
              />
            )}
          </CardBody>
        </Card>
      )}

      {/* Screen 7: Partial Data Screen */}
      {activeTab === 'partial' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 7: Partial Data Screen"
            subtitle="Renders what succeeded, avoids breaking the entire view, supplies DataValue fallbacks for missing fields, and adds subtle partial banner."
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={LuRefreshCw}
                onClick={() => setPartialDataError(!partialDataError)}
              >
                {partialDataError ? 'Simulate All Succeeded' : 'Simulate Partial Section Failure'}
              </Button>
            }
          />
          <CardBody className="space-y-6">
            {partialDataError && (
              <PartialDataBanner
                message="Financial ledger synced successfully, but live bank exchange rates could not be refreshed."
                staleSince="12 minutes ago"
                onRetry={() => {
                  setPartialDataError(false);
                  toast.success('All sections synchronized!');
                }}
              />
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-4 py-3">Club Role</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Emergency Contact</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900">Alex Morgan</td>
                    <td className="px-4 py-3 text-slate-600">President</td>
                    <td className="px-4 py-3 font-mono text-slate-700">STU-9921</td>
                    <td className="px-4 py-3">
                      <DataValue value="+1 (555) 019-2831" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900">Jordan Lee</td>
                    <td className="px-4 py-3 text-slate-600">Volunteer</td>
                    <td className="px-4 py-3 font-mono text-slate-700">STU-8834</td>
                    <td className="px-4 py-3">
                      {/* Deliberate fallback placeholder instead of undefined or NaN */}
                      <DataValue value={null} placeholder="Not provided" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">Pending</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900">Samantha Wu</td>
                    <td className="px-4 py-3 text-slate-600">Treasurer</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <DataValue value={undefined} placeholder="—" />
                    </td>
                    <td className="px-4 py-3">
                      <DataValue value="+1 (555) 438-9281" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Screen 8: Form Validation Error Screen */}
      {activeTab === 'validation' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 8: Accessible Form Validation Error State"
            subtitle="Accessible inline errors with icon + text + color + aria-invalid, required markers, and jump-link error summary."
          />
          <CardBody>
            <form onSubmit={handleFormSubmit} className="space-y-6 max-w-xl mx-auto" noValidate>
              {/* Form Error Summary at top */}
              <FormErrorSummary
                errors={formErrors}
                title="Please resolve 4 form errors to proceed"
                subtitle="Click any item below to jump straight to the respective field:"
              />

              <div className="space-y-4">
                <Input
                  id="eventName"
                  name="eventName"
                  label="Event Name"
                  required
                  placeholder="e.g. Spring Robotics Showcase"
                  value={formFields.eventName}
                  onChange={(e) => setFormFields({ ...formFields, eventName: e.target.value })}
                  error={formErrors.eventName}
                  helpText="Enter a recognizable title for students and faculty."
                />

                <Input
                  id="ticketPrice"
                  name="ticketPrice"
                  label="Ticket Price ($ USD)"
                  required
                  type="number"
                  placeholder="e.g. 15.00"
                  value={formFields.ticketPrice}
                  onChange={(e) => setFormFields({ ...formFields, ticketPrice: e.target.value })}
                  error={formErrors.ticketPrice}
                  helpText="Enter 0.00 for free community admission."
                />

                <Input
                  id="eventDate"
                  name="eventDate"
                  label="Event Date"
                  required
                  type="date"
                  value={formFields.eventDate}
                  onChange={(e) => setFormFields({ ...formFields, eventDate: e.target.value })}
                  error={formErrors.eventDate}
                />

                <Input
                  id="contactEmail"
                  name="contactEmail"
                  label="Faculty Advisor or Club Contact Email"
                  required
                  type="email"
                  placeholder="advisor@university.edu"
                  value={formFields.contactEmail}
                  onChange={(e) => setFormFields({ ...formFields, contactEmail: e.target.value })}
                  error={formErrors.contactEmail}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormFields({ eventName: '', ticketPrice: '', eventDate: '', contactEmail: '' });
                    setFormErrors({});
                  }}
                >
                  Clear Form
                </Button>
                <Button type="submit" className="font-bold shadow-md">
                  Submit Event
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Screen 9: Session Expired Screen */}
      {activeTab === 'session' && (
        <Card className="shadow-sm">
          <CardHeader
            title="Screen 9: Session Expired & Inactivity Handlers"
            subtitle="Trigger 401 unauthenticated session dialog or 60-second idle inactivity warning with 'Stay signed in' extension."
          />
          <CardBody className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 max-w-lg mx-auto text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
                <LuClock className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Test Authentication Session Handlers</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click below to simulate real-time API 401 session expiration (which preserves return URL and unsaved drafts),
                or simulate the 60-second idle timeout warning modal.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={triggerSessionExpired} icon={LuClock} className="font-bold shadow-md">
                  Trigger 401 Session Expired Modal
                </Button>
                <Button
                  variant="secondary"
                  onClick={triggerSessionWarning}
                  icon={LuSparkles}
                  className="font-bold"
                >
                  Simulate 60s Idle Warning
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
