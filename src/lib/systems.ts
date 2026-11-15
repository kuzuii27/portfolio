export type System = {
  id: string;
  title: string;
  outcome: string;
  features: string[];
  /** Only set where I have real past work behind it; every other card is "can build". */
  proof?: string;
  icon: string; // SVG path data, 24x24 stroke icon
};

export const SYSTEMS: System[] = [
  { id: 'coffee', title: 'Coffee shop system', outcome: 'Orders flow from the counter to the barista without shouting or paper slips.', features: ['Menu and order taking', 'Table or queue numbers', 'Barista display screen', 'Daily sales summary'], icon: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10h2a2 2 0 0 1 0 4h-2M7 3v3M11 3v3' },
  { id: 'pos', title: 'Cashier / POS', outcome: 'A fast checkout that ends the day with numbers that add up.', features: ['Quick checkout', 'Receipts', 'Cash and e-wallet payments', 'Shift reports and refunds'], icon: 'M4 4h16v6H4zM6 14h4M6 18h4M14 14h4v4h-4z' },
  { id: 'logistics', title: 'Logistics and fleet tracking', outcome: 'Know where every vehicle and delivery is without calling the driver.', features: ['Live vehicle map', 'Delivery status', 'Driver app', 'Route history'], proof: 'Builds on my GPS fleet-telematics work: internal tools and a field technicians\u2019 app.', icon: 'M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { id: 'kiosk', title: 'Self-service kiosk', outcome: 'Customers order and pay themselves, and staff only prepare.', features: ['Touch ordering', 'Payment', 'Queue ticket', 'Staff screen'], icon: 'M6 3h12v14H6zM9 21h6M12 17v4M9 7h6' },
  { id: 'inventory', title: 'Inventory and stock', outcome: 'Never find out you ran out when a customer asks.', features: ['Low-stock alerts', 'Supplier records', 'Barcode scanning'], icon: 'M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8M12 13v8' },
  { id: 'booking', title: 'Booking and appointments', outcome: 'Customers pick a slot, and no-shows drop.', features: ['Calendar', 'Reminders', 'Deposits'], icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { id: 'dashboards', title: 'Admin dashboards and reports', outcome: 'See how the business is doing without opening five spreadsheets.', features: ['Sales charts', 'Exports', 'Roles and permissions'], icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { id: 'automation', title: 'Custom business automation', outcome: 'Replace repeated manual work with a small tool that does it.', features: ['Quotation and cost calculators', 'Invoicing', 'Internal tools'], proof: 'Builds on my fintech internship: quotation and cost-calculation tools in C#, ASP.NET, Azure and SQL Server.', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z' },
];
