
import React, { useState, useRef, useEffect } from 'react';
import type { RouteData, Stop, Package, SelectedPackageInfo, ItineraryView as ItineraryViewType } from '../types';
import { MapPin, Package as PackageIcon, Navigation, AlertTriangle } from 'lucide-react';

// --- Swipeable Stop Item Component ---

const SwipeableStopItem: React.FC<{
  stopNumber: number;
  stop: Stop;
  isCompleted: boolean;
  onCompleteStop: (stopNumber: number) => void;
  onPackageSelect: (pkg: Package, stop: Stop) => void;
  onDismiss: (stopNumber: number) => void;
}> = ({ stopNumber, stop, isCompleted, onCompleteStop, onPackageSelect, onDismiss }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(isCompleted);

  // Detect when isCompleted changes from false to true
  useEffect(() => {
    if (!prevCompletedRef.current && isCompleted) {
      // Start collapse animation
      setTimeout(() => setIsCollapsing(true), 300);
      // Hide completely after collapse
      setTimeout(() => setIsHidden(true), 700);
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCompleted) return; // Don't allow swiping on completed items
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isCompleted) return;
    const touch = e.touches[0];
    const diff = touch.clientX - startX;
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setCurrentX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // If swiped more than 150px to the left, dismiss it
    if (currentX < -150) {
      setIsDismissed(true);
      setTimeout(() => {
        onDismiss(stopNumber);
      }, 300);
    } else {
      // Reset position
      setCurrentX(0);
    }
  };

  if (isDismissed || isHidden) {
    return null;
  }

  const translateX = currentX;
  const opacity = 1 + (currentX / 300); // Fade out as it swipes

  // Collapsed view - single line with checkmark
  if (isCollapsing) {
    return (
      <div
        className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center space-x-3 transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: '0px',
          opacity: 0,
          marginBottom: '0px',
          paddingTop: '0px',
          paddingBottom: '0px',
        }}
      >
        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          ✓
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{stop.address}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className="relative overflow-hidden transition-all duration-300 ease-out mb-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-300 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}
        style={{
          transform: `translateX(${translateX}px)`,
          opacity: opacity,
          transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease, background-color 0.3s ease, border-color 0.3s ease'
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isCompleted ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
              {isCompleted ? '✓' : stopNumber}
            </div>
            <div>
              <div className="font-bold text-lg text-gray-900">{stop.address}</div>
              <div className="text-gray-600 font-semibold">{stop.city}</div>
            </div>
          </div>
          {!isCompleted && (
            <button onClick={() => onCompleteStop(stopNumber)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold ml-2 transition-colors">
              Complete
            </button>
          )}
        </div>
        <div className="mt-2 text-sm text-blue-600 font-medium mb-3">
          📦 {stop.packages.length} package{stop.packages.length !== 1 ? 's' : ''} for delivery
        </div>
        <div className="space-y-3">
          {stop.packages.map((pkg) => (
            <button key={pkg.id} onClick={() => onPackageSelect(pkg, stop)} className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-all duration-200 transform active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{pkg.type === 'envelope' ? '📄' : '📦'}</div>
                  <div>
                    <div className="font-bold text-blue-800">{pkg.id}</div>
                    <div className="text-xs text-gray-600 mt-1 italic">{pkg.instructions}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-base font-bold ${pkg.weight > 30 ? 'text-red-600' : 'text-gray-800'}`}>{pkg.weight} lbs</div>
                  {pkg.weight > 30 && <div className="text-xs text-white bg-red-500 px-2 py-0.5 rounded-full font-bold mt-1">HEAVY</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- ItineraryList Component ---

const ItineraryList: React.FC<{
  routeData: RouteData;
  completedStops: number[];
  dismissedStops: number[];
  onCompleteStop: (stopNumber: number) => void;
  onPackageSelect: (pkg: Package, stop: Stop) => void;
  onDismissStop: (stopNumber: number) => void;
}> = ({ routeData, completedStops, dismissedStops, onCompleteStop, onPackageSelect, onDismissStop }) => (
  <div className="p-4">
    {/* FIX: Use Object.keys to iterate over stops to ensure proper typing for the 'stop' object. */}
    {Object.keys(routeData.stops).map((numStr) => {
      const stopNumber = parseInt(numStr, 10);
      const stop = routeData.stops[stopNumber];
      const isCompleted = completedStops.includes(stopNumber);
      const isDismissed = dismissedStops.includes(stopNumber);
      
      if (isDismissed) return null;
      
      return (
        <SwipeableStopItem
          key={stopNumber}
          stopNumber={stopNumber}
          stop={stop}
          isCompleted={isCompleted}
          onCompleteStop={onCompleteStop}
          onPackageSelect={onPackageSelect}
          onDismiss={onDismissStop}
        />
      );
    })}
  </div>
);

const MapView: React.FC<{ onSimulateEvent: (event: 'emergency') => void; transponderID: string }> = ({ onSimulateEvent, transponderID }) => {
  // Different routes for different drivers
  const isNashville = transponderID === 'TXD-423555'; // Amy
  
  const routePath = isNashville
    ? "M 60 350 L 100 290 L 160 240 L 200 180 L 230 120 L 240 60"  // Nashville route (different path)
    : "M 50 350 L 80 280 L 120 220 L 140 160 L 180 100 L 220 60 L 250 30";  // Irvine route (original)
  
  const hazardPath = isNashville
    ? "M 200 180 L 230 120"  // Hazard zone for Nashville
    : "M 180 100 L 220 60";  // Hazard zone for Irvine
  
  const hazardIconPosition = isNashville
    ? { x: 215, y: 150 }  // Nashville hazard icon position
    : { x: 200, y: 80 };  // Irvine hazard icon position
  
  const startPosition = isNashville
    ? { x: 60, y: 350 }
    : { x: 50, y: 350 };
  
  const endPosition = isNashville
    ? { x: 240, y: 60 }
    : { x: 250, y: 30 };
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [hazardVisible, setHazardVisible] = useState(false);
  const [hazardLogged, setHazardLogged] = useState(false);
  const [animationKey, setAnimationKey] = useState(1);
  const animationRef = useRef<SVGAnimateMotionElement | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hazardVisibleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hazardLogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const FALLBACK_BANNER = "https://techcrunch.com/wp-content/uploads/2014/06/amazon-angled.jpg";

  const startRouteSimulation = () => {
    if (isAnimating) return;
    
    // Clear any existing timeouts
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    if (hazardVisibleTimeoutRef.current) clearTimeout(hazardVisibleTimeoutRef.current);
    if (hazardLogTimeoutRef.current) clearTimeout(hazardLogTimeoutRef.current);
    
    // Reset states first
    setHazardVisible(false);
    setHazardLogged(false);
    
    // Increment key and set animating
    setAnimationKey(prev => prev + 1);
    setIsAnimating(true);
    
    // Start the animation programmatically
    setTimeout(() => {
      if (animationRef.current) {
        animationRef.current.beginElement();
      }
    }, 100);
    
    // Show hazard warning at 45% of the route (4.5 seconds)
    hazardVisibleTimeoutRef.current = setTimeout(() => {
      setHazardVisible(true);
    }, 4500);
    
    // Log hazard event at 60% of the route (6 seconds) - right as driver reaches start of hazard zone
    hazardLogTimeoutRef.current = setTimeout(() => {
      setHazardLogged(true);
      // Log the custom event
      const event = new CustomEvent('log-braze-event', { 
        detail: { eventName: 'upcoming_hazard_detected' }
      });
      window.dispatchEvent(event);
    }, 6000);
    
    // Reset animation after completion
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      setHazardVisible(false);
      setHazardLogged(false);
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (hazardVisibleTimeoutRef.current) clearTimeout(hazardVisibleTimeoutRef.current);
      if (hazardLogTimeoutRef.current) clearTimeout(hazardLogTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const renderFallback = () => {
      const container = bannerRef.current;
      if (!container) return;
      container.innerHTML = "";
      const img = document.createElement("img");
      img.src = FALLBACK_BANNER;
      img.alt = "Safety banner";
      img.style.width = "100%";
      img.style.height = "140px";
      img.style.objectFit = "cover";
      container.appendChild(img);
    };

    const braze = (window as any).braze;
    if (!braze || typeof braze.subscribeToBannersUpdates !== "function") {
      renderFallback();
      return;
    }

    const subscription = braze.subscribeToBannersUpdates((resp: any) => {
      const container = bannerRef.current;
      if (!container) return;
      container.innerHTML = "";

      if (resp?.slot_1) {
        try {
          braze.insertBanner(resp.slot_1, container);
          return;
        } catch (e) {
          console.warn("Braze banner insert failed, falling back to image", e);
        }
      }
      renderFallback();
    });

    // Request a refresh and immediately show fallback until a banner arrives
    try {
      braze.requestBannersRefresh?.(["slot_1"]);
    } catch (e) {
      console.warn("Braze banner refresh failed", e);
    }
    renderFallback();

    return () => {
      if (subscription?.remove) subscription.remove();
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gray-900 rounded-lg p-6 relative overflow-hidden" style={{ height: '400px' }}>
        {/* Map Background */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-gray-400">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Route Path */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400">
          {/* Main route line */}
          <path
            d={routePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Hazard zone (yellow/red section) */}
          <path
            d={hazardPath}
            fill="none"
            stroke={hazardVisible ? "#FCD34D" : "#3B82F6"}
            strokeWidth="6"
            strokeLinecap="round"
            className="transition-all duration-500"
          />

          {/* Start marker */}
          <circle cx={startPosition.x} cy={startPosition.y} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" />
          <text x={startPosition.x} y={startPosition.y + 20} fontSize="12" fill="white" textAnchor="middle">Start</text>

          {/* End marker */}
          <circle cx={endPosition.x} cy={endPosition.y} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" />
          <text x={endPosition.x} y={endPosition.y - 10} fontSize="12" fill="white" textAnchor="middle">End</text>

          {/* Hazard warning icon */}
          {hazardVisible && (
            <g transform={`translate(${hazardIconPosition.x}, ${hazardIconPosition.y})`} className="animate-pulse">
              <circle cx="0" cy="0" r="15" fill="#FEF3C7" opacity="0.9" />
              <text x="0" y="5" fontSize="18" textAnchor="middle">⚠️</text>
            </g>
          )}

          {/* Animated vehicle dot - slows down through hazard zone */}
          {isAnimating && (
            <circle key={`vehicle-${animationKey}`} r="10" fill="white" stroke="#3B82F6" strokeWidth="3">
              <animateMotion
                ref={animationRef}
                dur="10s"
                repeatCount="1"
                begin="indefinite"
                path={routePath}
                keyTimes="0; 0.5; 0.6; 0.8; 1"
                keyPoints="0; 0.5; 0.6; 0.8; 1"
                calcMode="linear"
              />
            </circle>
          )}
        </svg>

        {/* Instructions overlay */}
        {!isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 cursor-pointer" onClick={startRouteSimulation}>
            <div className="text-center">
              <Navigation className="w-16 h-16 text-white mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Tap to Start Route</p>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {isAnimating && (
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            🚗 En Route...
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button onClick={() => onSimulateEvent('emergency')} className="bg-red-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 mr-2"/> Safety Issue
        </button>
      </div>
      <div className="flex justify-center">
        <div
          ref={bannerRef}
          className="w-full max-w-lg mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{ minHeight: '140px' }}
        />
      </div>
    </div>
  );
};

const SummaryView: React.FC<{
  routeData: RouteData;
  completedStops: number[];
  currentTime: Date;
}> = ({ routeData, completedStops, currentTime }) => {
    const progress = (completedStops.length / routeData.totalStops) * 100;
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-100 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{completedStops.length}</div><div className="text-sm text-gray-600">Completed</div></div>
          <div className="bg-blue-100 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{routeData.totalStops - completedStops.length}</div><div className="text-sm text-gray-600">Remaining</div></div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{routeData.totalPackages}</div><div className="text-sm text-gray-600">Packages</div></div>
          <div className="bg-purple-100 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-purple-600">78%</div><div className="text-sm text-gray-600">On Time</div></div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Today's Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
          <div className="text-center text-sm text-gray-600 mt-2">{Math.round(progress)}% Complete</div>
        </div>
      </div>
    );
};

// --- Main ItineraryView Component ---

interface ItineraryViewProps {
  routeData: RouteData;
  completedStops: number[];
  dismissedStops: number[];
  currentTime: Date;
  onCompleteStop: (stopNumber: number) => void;
  onPackageSelect: (pkg: SelectedPackageInfo) => void;
  onSimulateEvent: (event: 'emergency') => void;
  onDismissStop: (stopNumber: number) => void;
  transponderID: string;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ routeData, completedStops, dismissedStops, currentTime, onCompleteStop, onPackageSelect, onSimulateEvent, onDismissStop, transponderID }) => {
  const [currentView, setCurrentView] = useState<ItineraryViewType>('list');

  const handlePackageSelection = (pkg: Package, stop: Stop) => {
      onPackageSelect({ ...pkg, stopInfo: stop });
  };

  return (
    <div>
      <div className="bg-gray-800 text-white px-4">
        <div className="flex space-x-8">
          <button onClick={() => setCurrentView('list')} className={`pb-3 text-base font-semibold transition-colors ${currentView === 'list' ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}>LIST</button>
          <button onClick={() => setCurrentView('map')} className={`pb-3 text-base font-semibold transition-colors ${currentView === 'map' ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}>MAP</button>
          <button onClick={() => setCurrentView('summary')} className={`pb-3 text-base font-semibold transition-colors ${currentView === 'summary' ? 'border-b-2 border-white text-white' : 'text-gray-400'}`}>SUMMARY</button>
        </div>
      </div>
      
      {currentView === 'list' && <ItineraryList routeData={routeData} completedStops={completedStops} dismissedStops={dismissedStops} onCompleteStop={onCompleteStop} onPackageSelect={handlePackageSelection} onDismissStop={onDismissStop} />}
      {currentView === 'map' && <MapView onSimulateEvent={onSimulateEvent} transponderID={transponderID} />}
      {currentView === 'summary' && <SummaryView routeData={routeData} completedStops={completedStops} currentTime={currentTime} />}
    </div>
  );
};

export default ItineraryView;