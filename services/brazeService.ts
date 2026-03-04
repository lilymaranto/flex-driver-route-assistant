
// A minimal interface for the Braze Web SDK object
interface Braze {
  initialize: (apiKey: string, options: any) => boolean;
  openSession: () => void;
  subscribeToInAppMessage: (callback: (inAppMessage: any) => void) => void;
  showInAppMessage: (inAppMessage: any) => void;
  changeUser: (userId: string) => void;
  getUser: () => {
    setCustomUserAttribute: (key: string, value: any) => void;
    addToCustomAttributeArray: (key: string, value: any) => void;
    setFirstName: (firstName: string) => void;
    setLastName: (lastName: string) => void;
  };
  logCustomEvent: (eventName: string, properties?: object) => void;
  requestContentCardsRefresh: () => void;
  requestImmediateDataFlush: () => void;
}

// Augment the Window interface to include `braze`
declare global {
  interface Window {
    braze?: Braze;
  }
}

interface BrazeConfig {
  apiKey: string;
  endpoint: string;
}

const loadBrazeSDK = (): Promise<Braze> => {
  return new Promise((resolve, reject) => {
    if (window.braze) {
      resolve(window.braze);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.appboycdn.com/web-sdk/6.3/braze.min.js';
    script.async = true;
    script.onload = () => {
      if (window.braze) {
        console.log('✅ Braze SDK script loaded successfully');
        resolve(window.braze);
      } else {
        reject(new Error('Braze SDK failed to load - window.braze not found'));
      }
    };
    script.onerror = (error) => {
      console.error('❌ Script loading error:', error);
      reject(new Error('Failed to load Braze SDK script'));
    };
    document.head.appendChild(script);
  });
};

class BrazeSDK {
  private isInitialized = false;
  private pendingEvents: { name: string; properties?: object }[] = [];

  async initialize(config: BrazeConfig): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await loadBrazeSDK();
      
      if(!window.braze) throw new Error("window.braze not found after loading SDK");

      const initialized = window.braze.initialize(config.apiKey, {
        baseUrl: config.endpoint,
        enableLogging: true,
        allowUserSuppliedJavascript: true,
        minimumIntervalBetweenTriggerActionsInSeconds: 0, // Allow back-to-back IAMs
        manualInAppMessageDisplayEnabled: true, // Manual display - we'll call showInAppMessage
        sessionTimeoutInSeconds: 600,
        doNotLoadFontAwesome: false,
      });

      if (!initialized) {
        throw new Error('Braze initialize() returned false');
      }

      window.braze.openSession();
      
      // Subscribe to IAM with MANUAL display
      window.braze.subscribeToInAppMessage((inAppMessage) => {
        console.log('📬 Braze In-App Message received:', inAppMessage);
        console.log('📋 IAM Type:', inAppMessage.constructor.name);
        
        // Dispatch custom event for debug overlay
        window.dispatchEvent(new CustomEvent('braze-iam-received', { detail: inAppMessage }));
        
        // MANUALLY display the IAM (required when manualInAppMessageDisplayEnabled is true)
        console.log('🎯 Calling showInAppMessage() manually...');
        window.braze?.showInAppMessage(inAppMessage);
        
        // Detect if this is a slideup or modal
        const isSlideup = inAppMessage.constructor.name === 'ge'; // Slideup type
        
        // Force visibility after IAM is inserted into DOM
        setTimeout(() => {
          const iamElements = document.querySelectorAll('.ab-iam-root, .ab-slideup, .ab-in-app-message');
          console.log(`🔍 Found ${iamElements.length} IAM elements in DOM`);
          
          if (iamElements.length > 0) {
            iamElements.forEach((el: any, index) => {
              console.log(`Element ${index}:`, el.className);
              
              // Force visibility with inline styles
              el.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 99999 !important;
                position: fixed !important;
              `;
              
              // Log computed styles for debugging
              const computed = window.getComputedStyle(el);
              console.log(`Computed styles:`, {
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity,
                position: computed.position
              });
              
              // Add close listener to flush data when user closes modal
              const closeBtn = el.querySelector('.ab-close-button');
              if (closeBtn && !isSlideup) {
                closeBtn.addEventListener('click', () => {
                  console.log('🔄 User closed IAM - flushing data for re-trigger');
                  window.braze?.requestImmediateDataFlush();
                });
              }
            });
            
            // Also force all child elements visible
            const allContent = document.querySelectorAll('.ab-in-app-message, .ab-message-text, .ab-image-area, .ab-close-button, .ab-message-buttons');
            allContent.forEach((el: any) => {
              el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            });
            
            console.log('✅ Forced IAM visibility via inline styles');
          } else {
            console.warn('⚠️ No IAM elements found in DOM to force visible');
          }
        }, 300);
        
        // Auto-dismiss ONLY slideups (hazard detection) after 3 seconds
        if (isSlideup) {
          setTimeout(() => {
            const slideupElements = document.querySelectorAll('.ab-slideup');
            if (slideupElements.length > 0) {
              slideupElements.forEach(el => {
                const closeBtn = el.querySelector('.ab-close-button');
                if (closeBtn) {
                  (closeBtn as HTMLElement).click();
                } else {
                  el.remove();
                }
              });
              console.log('🔄 Auto-dismissed slideup (hazard)');
              window.braze?.requestImmediateDataFlush();
            }
          }, 3000);
        }
      });
      
      // Request IAM refresh immediately
      window.braze.requestImmediateDataFlush();

      this.isInitialized = true;
      console.log('✅ Real Braze SDK Initialized Successfully');
      console.log('🔑 API Key:', config.apiKey);
      console.log('🌐 Endpoint:', config.endpoint);
      
      this.pendingEvents.forEach(event => this.logCustomEvent(event.name, event.properties));
      this.pendingEvents = [];

      return true;
    } catch (error) {
      console.error('❌ Braze SDK initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  changeUser(transponderID: string) {
    if (this.isInitialized && window.braze) {
      window.braze.changeUser(transponderID);
      console.log('🔄 Braze User ID set:', transponderID);
    }
  }

  setCustomUserAttribute(key: string, value: any) {
    if (this.isInitialized && window.braze) {
      window.braze.getUser().setCustomUserAttribute(key, value);
      console.log(`📝 braze.getUser().setCustomUserAttribute("${key}", ${JSON.stringify(value)})`);
    }
  }

  setFirstName(firstName: string) {
    if (this.isInitialized && window.braze) {
      window.braze.getUser().setFirstName(firstName);
      console.log(`👤 braze.getUser().setFirstName("${firstName}")`);
    }
  }

  setLastName(lastName: string) {
    if (this.isInitialized && window.braze) {
      window.braze.getUser().setLastName(lastName);
      console.log(`👤 braze.getUser().setLastName("${lastName}")`);
    }
  }

  setCompany(companyName: string) {
    if (this.isInitialized && window.braze) {
        window.braze.getUser().addToCustomAttributeArray("companies", companyName);
        console.log(`🏢 braze.getUser().addToCustomAttributeArray("companies", "${companyName}")`);
    }
  }

  logCustomEvent(eventName: string, properties: object = {}) {
    if (this.isInitialized && window.braze) {
      window.braze.logCustomEvent(eventName, properties);
      console.log(`📊 braze.logCustomEvent("${eventName}", ${JSON.stringify(properties)})`);
    } else {
      this.pendingEvents.push({ name: eventName, properties });
      console.log('⏳ Braze event queued:', eventName, properties);
    }
  }

  requestContentCardsRefresh() {
    if (this.isInitialized && window.braze) {
      window.braze.requestContentCardsRefresh();
      console.log('🔄 braze.requestContentCardsRefresh()');
    }
  }
}

export const brazeService = new BrazeSDK();
