const laptops = [
  {
    make: 'Dell',
    model: 'Latitude 5550',
    specs: {
      cpu: 'Intel Core Ultra 5 125U',
      ramGb: 16,
      storageTb: 0.512,
      storageType: 'NVMe SSD',
      displayInches: 15.6,
      operatingSystem: 'Windows 11 Pro',
      osVersion: '23H2',
      biometrics: true,
      tpmVersion: '2.0',
    },
  },
  {
    make: 'Lenovo',
    model: 'ThinkPad T16 Gen 3',
    specs: {
      cpu: 'AMD Ryzen 7 PRO 7840U',
      ramGb: 32,
      storageTb: 1.0,
      storageType: 'NVMe SSD',
      displayInches: 16.0,
      operatingSystem: 'Windows 11 Pro',
      osVersion: '23H2',
      biometrics: true,
      tpmVersion: '2.0',
    },
  },
  {
    make: 'HP',
    model: 'EliteBook 840 G11',
    specs: {
      cpu: 'Intel Core Ultra 7 165U',
      ramGb: 16,
      storageTb: 0.512,
      storageType: 'NVMe SSD',
      displayInches: 14.0,
      operatingSystem: 'Windows 11 Pro',
      osVersion: '23H2',
      biometrics: true,
      tpmVersion: '2.0',
    },
  },
  {
    make: 'Apple',
    model: 'MacBook Pro 14"',
    specs: {
      cpu: 'Apple M3 Pro',
      ramGb: 18,
      storageTb: 0.512,
      storageType: 'SSD',
      displayInches: 14.2,
      operatingSystem: 'macOS',
      osVersion: 'Sonoma 14.4',
      biometrics: true,
      tpmVersion: 'T2 Chip',
    },
  },
];

const monitors = [
  { make: 'Dell', model: 'U2724D UltraSharp', specs: { displayInches: 27, resolution: '2560x1440', panelType: 'IPS', ports: ['USB-C 90W', 'HDMI 2.0', 'DisplayPort 1.4', 'USB-A x4'] } },
  { make: 'LG', model: '27UK850-W', specs: { displayInches: 27, resolution: '3840x2160', panelType: 'IPS', ports: ['USB-C', 'HDMI x2', 'DisplayPort'] } },
  { make: 'HP', model: 'E27 G5', specs: { displayInches: 27, resolution: '1920x1080', panelType: 'IPS', ports: ['HDMI', 'DisplayPort', 'VGA', 'USB-A x4'] } },
];

const peripherals = [
  { make: 'Logitech', model: 'MX Keys S', type: 'Keyboard' },
  { make: 'Logitech', model: 'MX Master 3S', type: 'Mouse' },
  { make: 'Anker', model: 'PowerExpand 13-in-1 USB-C Hub', type: 'USB-C Hub' },
  { make: 'Logitech', model: 'C920 HD Pro', type: 'Webcam' },
  { make: 'Jabra', model: 'Evolve2 55', type: 'Headset' },
];

module.exports = { laptops, monitors, peripherals };
