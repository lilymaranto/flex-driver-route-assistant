
import React from 'react';
import type { DriverData, SelectedPackageInfo, EmergencyAlert } from '../types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ModalWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full transform transition-all animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Close modal"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

interface UserSettingsModalProps {
  driverData: DriverData;
  onUpdate: (field: keyof DriverData, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ driverData, onUpdate, onClose, onSave }) => (
  <ModalWrapper title="Driver Settings" onClose={onClose}>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transponder ID (External User ID)</label>
        <input
          type="text"
          value={driverData.transponderID}
          onChange={(e) => onUpdate('transponderID', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          placeholder="Enter transponder ID"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">DSP Account</label>
        <input
          type="text"
          value={driverData.dspAccount}
          onChange={(e) => onUpdate('dspAccount', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          placeholder="Enter DSP account name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle VIN</label>
        <input
          type="text"
          value={driverData.vehicleVIN}
          onChange={(e) => onUpdate('vehicleVIN', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          placeholder="Enter vehicle VIN"
          maxLength={17}
        />
      </div>
    </div>
    <div className="flex space-x-3 mt-6">
      <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-semibold transition-colors">Cancel</button>
      <button onClick={onSave} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold transition-colors shadow-sm">Save Changes</button>
    </div>
  </ModalWrapper>
);

interface PackageDetailsModalProps {
  packageInfo: SelectedPackageInfo;
  onClose: () => void;
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({ packageInfo, onClose }) => (
  <ModalWrapper title="Package Details" onClose={onClose}>
    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-gray-600">Package ID:</span><span className="font-semibold text-gray-800">{packageInfo.id}</span></div>
      <div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className={`font-semibold ${packageInfo.weight > 30 ? 'text-red-600' : 'text-gray-800'}`}>{packageInfo.weight} lbs {packageInfo.weight > 30 && '⚠️'}</span></div>
      <div className="flex justify-between"><span className="text-gray-600">Type:</span><span className="font-semibold text-gray-800 capitalize">{packageInfo.type.replace('_', ' ')}</span></div>
      <div className="flex justify-between"><span className="text-gray-600">Recipient:</span><span className="font-semibold text-gray-800">{packageInfo.recipient}</span></div>
      <div className="flex justify-between text-right"><span className="text-gray-600">Address:</span><span className="font-semibold text-gray-800 ml-2">{packageInfo.stopInfo.address}</span></div>
      <div className="border-t pt-3 mt-2">
        <div className="text-gray-600 mb-1">Delivery Instructions:</div>
        <div className="font-medium bg-gray-100 p-3 rounded-md text-gray-800">{packageInfo.instructions}</div>
      </div>
      {packageInfo.weight > 30 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
          <div className="text-red-800 font-semibold mb-1">Heavy Package Alert</div>
          <div className="text-red-700 text-xs">Use proper lifting technique and consider requesting assistance.</div>
        </div>
      )}
    </div>
    <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-md w-full mt-6 hover:bg-blue-700 font-semibold transition-colors shadow-sm">Close</button>
  </ModalWrapper>
);


export const EmergencyAlertModal: React.FC<{ alert: EmergencyAlert }> = ({ alert }) => (
  <div className="fixed inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center p-4 z-50 animate-fade-in">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center shadow-2xl transform animate-slide-up">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-800 mb-2">{alert.title}</h3>
      <p className="text-gray-700 mb-6">{alert.message}</p>
      <div className="flex space-x-3">
        <button onClick={() => alert.onRespond('ok')} className="bg-green-500 text-white px-4 py-3 rounded-lg flex-1 flex items-center justify-center font-semibold hover:bg-green-600 transition-colors shadow-sm">
          <CheckCircle className="w-5 h-5 mr-2" /> I'm OK
        </button>
        <button onClick={() => alert.onRespond('need_help')} className="bg-red-500 text-white px-4 py-3 rounded-lg flex-1 flex items-center justify-center font-semibold hover:bg-red-600 transition-colors shadow-sm">
          <XCircle className="w-5 h-5 mr-2" /> Need Help
        </button>
      </div>
    </div>
  </div>
);
