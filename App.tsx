
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, Bell, Package, HelpCircle } from 'lucide-react';
import type { DriverData, RouteData, Screen, AppNotification, SelectedPackageInfo, Package as Pkg, Stop } from './types';
import { brazeService } from './services/brazeService';
import ItineraryView from './components/ItineraryView';
import { UserSettingsModal, PackageDetailsModal } from './components/modals';
import { startWebSession, setUser as syncUserToNative, listenForNative, notifyWebReady } from './solcon-starter/demo_bridge_entry';
import personaMap from './solcon-starter/persona-map.json';

// --- Constants and Initial Data ---

// Michael's data (Irvine)
const MICHAEL_DRIVER_DATA: DriverData = {
  transponderID: 'TXD-789432',
  dspAccount: "Matt's DSP",
  vehicleVIN: '1FTBF2B69MEA12345',
  driverName: 'Michael Rodriguez',
  routeID: '1005705',
  pickupArea: 'IRV.D04'
};

const MICHAEL_ROUTE_DATA: RouteData = {
  totalStops: 5,
  totalPackages: 45,
  stops: {
    1: { address: '1 Spectrum Center Dr', city: 'IRVINE', packages: [{ id: 'TBA055699', weight: 15, type: 'box', recipient: 'John Smith', instructions: 'Leave at front door' }] },
    2: { address: '2372 Michelson Dr', city: 'IRVINE', packages: [{ id: 'TBA055700', weight: 35, type: 'plastic_bag', recipient: 'Sarah Johnson', instructions: 'Ring doorbell' }, { id: 'TBA057391', weight: 12, type: 'box', recipient: 'Mike Davis', instructions: 'Leave at door' }] },
    3: { address: '15 Park Plaza', city: 'IRVINE', packages: [{ id: 'TBA055233', weight: 8, type: 'envelope', recipient: 'Mike Chen', instructions: 'Business hours only' }] },
    4: { address: '4100 Newport Center Dr', city: 'IRVINE', packages: [{ id: 'TBA055701', weight: 25, type: 'box', recipient: 'Lisa Garcia', instructions: 'Apartment 5B' }, { id: 'TBA055702', weight: 42, type: 'large_box', recipient: 'David Kim', instructions: 'Heavy item - use service elevator' }, { id: 'TBA055703', weight: 6, type: 'envelope', recipient: 'Anna Wong', instructions: 'Signature required' }] },
    5: { address: '18200 Von Karman Ave', city: 'IRVINE', packages: [{ id: 'TBA055704', weight: 18, type: 'box', recipient: 'Robert Taylor', instructions: 'Leave with concierge' }] }
  }
};

// Amy's data (Nashville)
const AMY_DRIVER_DATA: DriverData = {
  transponderID: 'TXD-423555',
  dspAccount: "Matt's DSP",
  vehicleVIN: '1FTBF2B69MEA67890',
  driverName: 'Amy Chen',
  routeID: '2007812',
  pickupArea: 'NSH.C02'
};

const AMY_ROUTE_DATA: RouteData = {
  totalStops: 5,
  totalPackages: 38,
  stops: {
    1: { address: '222 Fifth Avenue South', city: 'NASHVILLE', packages: [{ id: 'TBA067823', weight: 22, type: 'box', recipient: 'Emily Davis', instructions: 'Deliver to front desk' }, { id: 'TBA067824', weight: 8, type: 'envelope', recipient: 'James Wilson', instructions: 'Leave at reception' }] },
    2: { address: '119 Third Avenue South', city: 'NASHVILLE', packages: [{ id: 'TBA067825', weight: 38, type: 'large_box', recipient: 'Patricia Martinez', instructions: 'Heavy - use loading dock' }, { id: 'TBA067826', weight: 14, type: 'box', recipient: 'Robert Anderson', instructions: 'Ring bell' }] },
    3: { address: '116 Fifth Avenue North', city: 'NASHVILLE', packages: [{ id: 'TBA067827', weight: 6, type: 'envelope', recipient: 'Linda Thomas', instructions: 'Business hours only' }, { id: 'TBA067828', weight: 18, type: 'box', recipient: 'William Taylor', instructions: 'Leave at box office' }, { id: 'TBA067829', weight: 42, type: 'large_box', recipient: 'Barbara Moore', instructions: 'Heavy equipment - call upon arrival' }] },
    4: { address: '501 Broadway', city: 'NASHVILLE', packages: [{ id: 'TBA067830', weight: 12, type: 'box', recipient: 'Christopher Jackson', instructions: 'Suite 200' }, { id: 'TBA067831', weight: 9, type: 'plastic_bag', recipient: 'Jennifer White', instructions: 'Leave with security' }] },
    5: { address: '500 Rep John Lewis Way North', city: 'NASHVILLE', packages: [{ id: 'TBA067832', weight: 28, type: 'box', recipient: 'Michael Harris', instructions: 'Apartment 12A - call first' }, { id: 'TBA067833', weight: 35, type: 'large_box', recipient: 'Sarah Clark', instructions: 'Heavy - use freight elevator' }] }
  }
};

const DRIVER_PROFILES: Record<string, { driverData: DriverData; routeData: RouteData }> = {
  [MICHAEL_DRIVER_DATA.transponderID]: { driverData: MICHAEL_DRIVER_DATA, routeData: MICHAEL_ROUTE_DATA },
  [AMY_DRIVER_DATA.transponderID]: { driverData: AMY_DRIVER_DATA, routeData: AMY_ROUTE_DATA },
};

const CONFIG_ID = 'flex-driver-route-assistant';
const DEFAULT_USER_ID = (personaMap as { defaultUserId?: string }).defaultUserId || MICHAEL_DRIVER_DATA.transponderID;
const INITIAL_DRIVER_PROFILE = DRIVER_PROFILES[DEFAULT_USER_ID] || DRIVER_PROFILES[MICHAEL_DRIVER_DATA.transponderID];
const INITIAL_DRIVER_DATA = INITIAL_DRIVER_PROFILE.driverData;
const INITIAL_ROUTE_DATA = INITIAL_DRIVER_PROFILE.routeData;

const BRAZE_CONFIG = {
  apiKey: '2502c62e-82b0-46a3-9239-2418e1c4ed52',
  endpoint: 'sdk.iad-03.braze.com'
};


// --- Helper Components ---
const Header: React.FC<{ onMenuClick: () => void; screen: Screen; notificationCount: number }> = ({ onMenuClick, screen, notificationCount }) => (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0 z-20">
        <button onClick={onMenuClick} className="p-2 -m-2"><Menu className="w-6 h-6" /></button>
        <h1 className="text-lg font-semibold uppercase tracking-wider">{screen}</h1>
        <div className="flex items-center space-x-2">
            <button className="p-2 -m-2 relative">
                <Bell className="w-6 h-6" />
                {notificationCount > 0 && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800" />}
            </button>
            <button className="p-2 -m-2"><HelpCircle className="w-6 h-6" /></button>
        </div>
    </div>
);

const SideMenu: React.FC<{ driverData: DriverData; onClose: () => void; onShowSettings: () => void; onChangeUser: () => void }> = ({ driverData, onClose, onShowSettings, onChangeUser }) => (
    <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
        <div className="absolute top-0 left-0 bottom-0 w-4/5 max-w-xs bg-white shadow-lg p-4 flex flex-col animate-slide-in-left">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Menu</h2>
                <button onClick={onClose} className="p-2 -m-2"><X className="w-6 h-6 text-gray-600"/></button>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">{driverData.driverName.charAt(0)}</div>
                <div>
                    <div className="font-semibold text-gray-800">{driverData.driverName}</div>
                    <div className="text-sm text-gray-600">{driverData.dspAccount}</div>
                </div>
            </div>
            <nav className="flex-grow">
                <button onClick={onChangeUser} className="w-full text-left p-3 hover:bg-gray-100 rounded-md">🔄 Switch User</button>
                <button onClick={onShowSettings} className="w-full text-left p-3 hover:bg-gray-100 rounded-md">🔧 Update Driver Settings</button>
            </nav>
            <button className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-md font-semibold">Sign Out</button>
        </div>
    </div>
);

const BottomNav: React.FC<{ activeScreen: Screen; onScreenChange: (screen: Screen) => void; notificationCount: number }> = ({ activeScreen, onScreenChange, notificationCount }) => (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex z-20">
        {[
            { screen: 'notifications' as Screen, icon: Bell, label: 'Updates' },
            { screen: 'itinerary' as Screen, icon: Package, label: 'Itinerary' },
        ].map(item => (
            <button key={item.screen} onClick={() => onScreenChange(item.screen)} className={`flex-1 py-3 px-2 text-center transition-colors ${activeScreen === item.screen ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                <div className="relative inline-block">
                    <item.icon className="w-7 h-7 mx-auto mb-1" />
                    {item.screen === 'notifications' && notificationCount > 0 && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
            </button>
        ))}
    </div>
);

const NotificationsView: React.FC<{ notifications: AppNotification[] }> = ({ notifications }) => (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Updates</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
          <p>No new notifications.</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-800">{n.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{n.message}</p>
            <p className="text-xs text-gray-400 mt-2 text-right">{n.time}</p>
          </div>
        ))
      )}
    </div>
);

const ChangeUserModal: React.FC<{ currentTransponderID: string; onClose: () => void; onSwitch: (newID: string) => void }> = ({ currentTransponderID, onClose, onSwitch }) => {
  const [inputID, setInputID] = useState(currentTransponderID);
  
  const handleSubmit = () => {
    if (inputID.trim()) {
      onSwitch(inputID.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Switch User</h2>
          <button onClick={onClose} className="p-2 -m-2"><X className="w-6 h-6 text-gray-600"/></button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Transponder ID</label>
          <input
            type="text"
            value={inputID}
            onChange={(e) => setInputID(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter Transponder ID"
          />
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            <div><strong>Available Users:</strong></div>
            <div>• Michael Rodriguez: <code className="bg-gray-100 px-2 py-1 rounded">TXD-789432</code></div>
            <div>• Amy Chen: <code className="bg-gray-100 px-2 py-1 rounded">TXD-423555</code></div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Switch User
          </button>
        </div>
      </div>
    </div>
  );
};

const UserSwitchedConfirmation: React.FC<{ driverName: string }> = ({ driverName }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center animate-scale-in">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">User Switched!</h3>
      <p className="text-gray-600">Logged in as <strong>{driverName}</strong></p>
    </div>
  </div>
);


// --- Main App Component ---

const App: React.FC = () => {
  const [driverData, setDriverData] = useState<DriverData>(INITIAL_DRIVER_DATA);
  const [routeData, setRouteData] = useState<RouteData>(INITIAL_ROUTE_DATA);
  const [currentScreen, setCurrentScreen] = useState<Screen>('itinerary');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [completedStops, setCompletedStops] = useState<number[]>([]);
  const [dismissedStops, setDismissedStops] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackageInfo | null>(null);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showChangeUser, setShowChangeUser] = useState(false);
  const [showUserSwitchedConfirmation, setShowUserSwitchedConfirmation] = useState(false);
  const nativeListenerRegistered = useRef(false);
  const activeUserIdRef = useRef(INITIAL_DRIVER_DATA.transponderID);

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timeInterval);
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'time'>) => {
    setNotifications(prev => [{ ...notification, id: Date.now(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }, ...prev]);
  }, []);

  const syncBrazeProfile = useCallback((profile: DriverData) => {
    brazeService.changeUser(profile.transponderID);
    
    const [firstName, ...lastNameParts] = profile.driverName.split(' ');
    const lastName = lastNameParts.join(' ');
    brazeService.setFirstName(firstName);
    brazeService.setLastName(lastName);
    
    Object.entries(profile).forEach(([key, value]) => {
        if (key !== 'driverName') {
          brazeService.setCustomUserAttribute(key, value);
        }
    });
    
    if (profile.transponderID === 'TXD-423555') {
      brazeService.setCustomUserAttribute('Level', '1');
      brazeService.setCustomUserAttribute('Last_Category', 'Vehicle Maintenance');
    }
    
    if (profile.dspAccount) {
        brazeService.setCompany(profile.dspAccount);
    }
    brazeService.requestContentCardsRefresh();
  }, []);

  const resolveDriverProfile = useCallback((transponderId: string) => DRIVER_PROFILES[transponderId], []);

  const safeStartSession = useCallback((userId: string) => {
    try {
      startWebSession({ userId, configId: CONFIG_ID });
    } catch (error) {
      console.warn('SolCon startWebSession failed - DemoBridge missing?', error);
    }
  }, []);

  const safeSyncToNative = useCallback(
    (userId: string, reason: 'default' | 'manual' | 'restore' | 'fallback' | 'admin' = 'manual') => {
      try {
        syncUserToNative(userId, reason);
      } catch (error) {
        console.warn('SolCon setUser failed - DemoBridge missing?', error);
      }
    },
    []
  );

  useEffect(() => {
    // Listen for hazard detection event from map
    const handleBrazeEvent = (e: any) => {
      if (e.detail.eventName === 'upcoming_hazard_detected') {
        brazeService.logCustomEvent('upcoming_hazard_detected', { route_id: driverData.routeID });
        addNotification({ type: 'event', title: 'Hazard Detected', message: 'Upcoming hazard detected on route. Proceed with caution.' });
      }
    };
    
    window.addEventListener('log-braze-event', handleBrazeEvent);
    return () => window.removeEventListener('log-braze-event', handleBrazeEvent);
  }, [driverData.routeID, addNotification]);

  useEffect(() => {
    const initializeBrazeSession = async () => {
      const success = await brazeService.initialize(BRAZE_CONFIG);
      if (success) {
        syncBrazeProfile(driverData);
        notifyWebReady({
          configId: CONFIG_ID,
          userId: driverData.transponderID,
        });
      }
    };
    initializeBrazeSession();
    // Reset dismissed stops when user changes
    setDismissedStops([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverData.transponderID, syncBrazeProfile]);

  useEffect(() => {
    safeStartSession(INITIAL_DRIVER_DATA.transponderID);
  }, [safeStartSession]);

  const handleNativeUserUpdate = useCallback(
    (incomingUserId: string) => {
      const profile = resolveDriverProfile(incomingUserId);
      if (!profile) {
        addNotification({ type: 'event', title: 'Unknown Native User', message: `Native sent unmapped user ID ${incomingUserId}` });
        return;
      }

      activeUserIdRef.current = incomingUserId;
      setDriverData(profile.driverData);
      setRouteData(profile.routeData);
      setCompletedStops([]);
      setDismissedStops([]);
      setShowChangeUser(false);
      setMenuOpen(false);

      addNotification({ 
        type: 'settings_updated', 
        title: 'User Synced from Native', 
        message: `Mirrored user ${profile.driverData.driverName}` 
      });
    },
    [resolveDriverProfile, addNotification]
  );

  useEffect(() => {
    if (nativeListenerRegistered.current) return;
    nativeListenerRegistered.current = true;
    try {
      listenForNative((incomingUserId: string) => {
        handleNativeUserUpdate(incomingUserId);
      });
    } catch (error) {
      console.warn('listenForNative failed - DemoBridge missing?', error);
    }
  }, [handleNativeUserUpdate]);

  const handleUpdateDriverData = (field: keyof DriverData, value: string) => {
    setDriverData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    setShowUserSettings(false);

    if (driverData.transponderID !== activeUserIdRef.current) {
      handleSwitchUser(driverData.transponderID, 'manual');
      return;
    }

    syncBrazeProfile(driverData);
    safeSyncToNative(driverData.transponderID, 'manual');
    addNotification({ type: 'settings_updated', title: 'Driver Settings Updated', message: 'Braze user attributes have been synchronized.' });
  };

  const handleSimulateEvent = (event: 'emergency') => {
    brazeService.logCustomEvent('safety_issue_detected', { route_id: driverData.routeID });
    addNotification({ type: 'event', title: 'Braze Event Logged', message: 'Safety issue detected and logged.' });
  };

  const handleCompleteStop = (stopNumber: number) => {
    setCompletedStops(prev => [...prev, stopNumber]);
    addNotification({ type: 'stop_completed', title: 'Stop Completed', message: `Stop ${stopNumber} marked as delivered.` });
    brazeService.logCustomEvent('stop_completed', { stop_number: stopNumber, route_id: driverData.routeID });
    
    // Check the next stop for heavy packages
    const nextStopNumber = stopNumber + 1;
    const nextStop = routeData.stops[nextStopNumber];
    
    if (nextStop && !completedStops.includes(nextStopNumber) && !dismissedStops.includes(nextStopNumber)) {
      // Find the first heavy package (weight > 30) in the next stop
      const heavyPackage = nextStop.packages.find(pkg => pkg.weight > 30);
      
      if (heavyPackage) {
        brazeService.logCustomEvent('next_delivery_heavy_package', { 
          weight: heavyPackage.weight,
          route_id: driverData.routeID 
        });
        addNotification({ 
          type: 'event', 
          title: 'Heavy Package Alert', 
          message: `Next stop has a heavy package (${heavyPackage.weight} lbs). Prepare accordingly.` 
        });
      }
    }
  };

  const handlePackageSelect = (packageInfo: SelectedPackageInfo) => {
    setSelectedPackage(packageInfo);
    if (packageInfo.weight > 30) {
      brazeService.logCustomEvent('driver_viewed_heavy_package', { package_id: packageInfo.id, package_weight: packageInfo.weight, route_id: driverData.routeID });
    }
  };

  const handleDismissStop = (stopNumber: number) => {
    setDismissedStops(prev => [...prev, stopNumber]);
    brazeService.logCustomEvent('stop_dismissed', { stop_number: stopNumber, route_id: driverData.routeID });
    addNotification({ type: 'event', title: 'Stop Dismissed', message: `Stop ${stopNumber} dismissed from view.` });
    
    // Check the next stop for heavy packages
    const nextStopNumber = stopNumber + 1;
    const nextStop = routeData.stops[nextStopNumber];
    
    if (nextStop && !dismissedStops.includes(nextStopNumber)) {
      // Find the first heavy package (weight > 30) in the next stop
      const heavyPackage = nextStop.packages.find(pkg => pkg.weight > 30);
      
      if (heavyPackage) {
        brazeService.logCustomEvent('next_delivery_heavy_package', { 
          weight: heavyPackage.weight,
          route_id: driverData.routeID 
        });
        addNotification({ 
          type: 'event', 
          title: 'Heavy Package Alert', 
          message: `Next stop has a heavy package (${heavyPackage.weight} lbs). Prepare accordingly.` 
        });
      }
    }
  };

  const handleSwitchUser = useCallback(
    (newTransponderID: string, reason: 'manual' | 'default' = 'manual') => {
      const profile = resolveDriverProfile(newTransponderID);
      if (!profile) {
        addNotification({ type: 'event', title: 'Error', message: 'Unknown user ID. Please use TXD-789432 or TXD-423555.' });
        return;
      }

      safeSyncToNative(newTransponderID, reason);
      activeUserIdRef.current = newTransponderID;

      setDriverData(profile.driverData);
      setRouteData(profile.routeData);
      setCompletedStops([]);
      setDismissedStops([]);
      setShowChangeUser(false);
      setMenuOpen(false);
      
      setShowUserSwitchedConfirmation(true);
      setTimeout(() => {
        setShowUserSwitchedConfirmation(false);
      }, 2000);
      
      addNotification({ 
        type: 'settings_updated', 
        title: 'User Switched', 
        message: `Logged in as ${profile.driverData.driverName}` 
      });
    },
    [resolveDriverProfile, addNotification, safeSyncToNative]
  );

  return (
    <div className="w-full max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col relative">
      <Header onMenuClick={() => setMenuOpen(true)} screen={currentScreen} notificationCount={notifications.length} />
      
      {menuOpen && <SideMenu driverData={driverData} onClose={() => setMenuOpen(false)} onShowSettings={() => { setMenuOpen(false); setShowUserSettings(true); }} onChangeUser={() => { setMenuOpen(false); setShowChangeUser(true); }} />}

      <main className="flex-grow overflow-y-auto pb-20">
        {currentScreen === 'itinerary' && (
          <ItineraryView
            routeData={routeData}
            completedStops={completedStops}
            dismissedStops={dismissedStops}
            currentTime={currentTime}
            onCompleteStop={handleCompleteStop}
            onPackageSelect={handlePackageSelect}
            onSimulateEvent={handleSimulateEvent}
            onDismissStop={handleDismissStop}
            transponderID={driverData.transponderID}
          />
        )}
        {currentScreen === 'notifications' && <NotificationsView notifications={notifications} />}
      </main>

      <BottomNav activeScreen={currentScreen} onScreenChange={setCurrentScreen} notificationCount={notifications.length} />
      
      {showUserSettings && <UserSettingsModal driverData={driverData} onUpdate={handleUpdateDriverData} onClose={() => setShowUserSettings(false)} onSave={handleSaveSettings} />}
      {selectedPackage && <PackageDetailsModal packageInfo={selectedPackage} onClose={() => setSelectedPackage(null)} />}
      {showChangeUser && <ChangeUserModal currentTransponderID={driverData.transponderID} onClose={() => setShowChangeUser(false)} onSwitch={handleSwitchUser} />}
      {showUserSwitchedConfirmation && <UserSwitchedConfirmation driverName={driverData.driverName} />}
    </div>
  );
};

export default App;
