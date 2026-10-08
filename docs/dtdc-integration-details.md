# DTDC Direct API Integration Documentation — Anjali Alankaram

This document records the complete architecture, API specifications, and operational workflows for the **DTDC Direct API Integration** implemented for Anjali Alankaram.

---

## 1. Account & Franchisee Information
* **Company Name:** Anjali Alankaram
* **Point of Contact (POC):** Anjali
* **POC Email:** anjalialankaram@gmail.com
* **POC Contact Number:** +91 8919045363
* **Origin Location:** Vizianagaram, Andhra Pradesh (Pincode: `535002`)
* **DTDC Customer Code:** `VO1494`
* **Default Pickup Service:** B2C SMART EXPRESS

### DTDC Franchisee / Branch Details
* **Region:** VIJAYAWADA
* **Customer Type:** CPDP
* **Franchisee Code:** `VF1657`
* **Franchisee Name:** Pusapatirega
* **Franchisee Owner Name:** PEERUBANDI RAHUL KUMAR
* **Franchisee Contact No:** +91 9030574737
* **Franchisee Email:** pusapatirega.vja@fr.dtdc.com
* **Sales / Channel Person:** Rahul

---

## 2. Technical Contacts & Architecture
* **IT Lead / Developer Contact:** Jagadish Varma
* **IT Email:** jagadishvarma99@gmail.com
* **IT Contact Number:** +91 7032492775
* **Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL
* **Frontend:** Next.js 14 (App Router), Tailwind CSS
* **Infrastructure:** AWS EC2 (`ap-south-2`), Nginx, Docker / PM2

---

## 3. Integrated DTDC APIs & Specifications

The application directly implements all 4 official DTDC specifications:

### A. Order Upload / Booking API (Softdata) Ver 2.0
* **Staging URL:** `https://alphademodashboardapi.shipsy.io/api/customer/integration/consignment/softdata`
* **Production URL:** `https://pxapi.dtdc.in/api/customer/integration/consignment/softdata`
* **Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
  * `api-key: <DTDC_API_KEY>`
* **Payload Structure:**
  * `customer_code`: Unique client code (`VO1494`)
  * `service_type_id`: `B2C SMART EXPRESS`
  * `load_type`: `NON-DOCUMENT`
  * `consignment_type`: `Forward`
  * `dimension_unit`: `cm`
  * `weight_unit`: `kg`
  * `origin_details`: Warehouse name, phone, address line 1, pincode, city, state
  * `destination_details`: Customer shipping address, phone, pincode, city, state
  * `return_details`: RTO address
  * `customer_reference_number`: Order Number (e.g. `ORD-20261005-001`)
  * `cod_collection_mode` & `cod_amount`: `CASH` + total amount (if COD)
* **Response:** Returns AWB number in `data[0].reference_number`.

### B. Shipping Label API WS Ver 2.0
* **Staging URL:** `https://alphademodashboardapi.shipsy.io/api/customer/integration/consignment/shippinglabel/stream`
* **Production URL:** `https://pxapi.dtdc.in/api/customer/integration/consignment/shippinglabel/stream`
* **Method:** `GET`
* **Headers:**
  * `api-key: <DTDC_API_KEY>`
* **Query Parameters:**
  * `reference_number`: Consignment AWB number
  * `label_code`: `SHIP_LABEL_4X6` (Thermal barcode label) or `SHIP_LABEL_A4` (A4 standard)
  * `label_format`: `pdf` (direct binary stream) or `base64` (JSON base64 string)
* **Implementation:** Streamed directly through backend proxy (`/shipping/dtdc/label/:awb`) with browser print & inline preview.

### C. Cancellation API Ver 2.0
* **Staging URL:** `https://alphademodashboardapi.shipsy.io/api/customer/integration/consignment/cancel`
* **Production URL:** `https://pxapi.dtdc.in/api/customer/integration/consignment/cancel`
* **Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
  * `api-key: <DTDC_API_KEY>`
* **Payload:**
  ```json
  {
    "AWBNo": ["D78326386"],
    "customerCode": "VO1494"
  }
  ```
* **Implementation:** Triggered on admin cancellation before dispatch (`/shipping/dtdc/cancel/:orderId`).

### D. REST Tracking API V4 (JSON Based)
* **Authentication:**
  * **Staging:** `GET https://dtdcstagingapi.dtdc.com/dtdc-api/api/dtdc/authenticate?username=<username>&password=<password>`
  * **Production:** `GET https://blktracksvc.dtdc.com/dtdc-api/api/dtdc/authenticate?username=<username>&password=<password>`
  * **Token Management:** The token is dynamically fetched and cached in memory with a 2-hour TTL.
* **Tracking Request:**
  * **Staging:** `POST https://dtdcstagingapi.dtdc.com/dtdc-tracking-api/dtdc-api/rest/JSONCnTrk/getTrackDetails`
  * **Production:** `POST https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails`
  * **Headers:** `x-access-token: <Token>`, `Content-Type: application/json`
  * **Body:**
    ```json
    {
      "trkType": "cnno",
      "strcnno": "7D111521048",
      "addtnlDtl": "Y"
    }
    ```
* **Event Mapping:**
  * `strActionDate` (`DDMMYYYY`) + `strActionTime` (`HHMM`) converted to native JavaScript `Date`.
  * Checkpoints extracted from `trackDetails[]` and `trackHeader`.

---

## 4. Live Tracking & Automated Status Transitions

When tracking checkpoints are queried by customers or admins, the application automatically synchronizes the order status based on DTDC scan codes:

| DTDC Scan Code / Action | Meaning | Synchronized Order Status |
| :--- | :--- | :--- |
| `BKD` / `Booked` / `PCAW` / `PCSC` / `PCRA` | Pickup scheduled or booked at origin | `SHIPPED` |
| `PCUP` / `Picked Up` / `DISPATCHED` / `RECEIVED` | En route between transit hubs | `IN_TRANSIT` |
| `OUTDLV` / `Out For Delivery` | With delivery rider for delivery today | `OUT_FOR_DELIVERY` |
| `DLV` / `Delivered` | Successfully signed & delivered to customer | `DELIVERED` (auto sets `deliveredAt`) |
| `NONDLV` / `HELDUP` | Delivery exception or door lock | Preserved with scan note |
| `RTO` / `Consignment Has Returned` | Return to Origin | Flagged in order audit |

---

## 5. UI Features & Admin Controls

### Admin Orders Management (`/admin/orders/[id]`):
1. **Book Consignment via DTDC API**: One-click booking with DTDC, assigns AWB, courier name, and tracking link.
2. **Download Label (4x6)**: Direct thermal printer-ready PDF label.
3. **Download Label (A4)**: A4 standard printable invoice/label.
4. **Cancel DTDC Consignment**: Instantly cancels the booking on DTDC servers.

### Customer Order View (`/orders/[id]`):
* **Live Tracking Widget**: Visual tracking timeline showing real-time checkpoints, hub locations, timestamps, and rider notes.
* **Live Refresh**: Button to trigger instant on-demand courier checkpoint re-fetch.

---

## 6. Environment Configuration Variables

```env
# DTDC Production Settings
DTDC_ENV=production
DTDC_CUSTOMER_CODE=VO1494
DTDC_API_KEY=71db28f9feee0cef26fc9cf242e97c

# DTDC Tracking API V4 Credentials
DTDC_TRACKING_USERNAME=VO1494_trk_json
DTDC_TRACKING_PASSWORD=UbrMi
DTDC_TRACKING_TOKEN=VO1494_trk_json:ab3095ff05d70972cadebeb1076980a7

# Origin Warehouse Information (Mapped to DTDC Vizianagaram Hub 535003)
DTDC_ORIGIN_NAME="Anjali Alankaram"
DTDC_ORIGIN_PHONE="8919045363"
DTDC_ORIGIN_PINCODE="535003"
DTDC_ORIGIN_CITY="Vizianagaram"
DTDC_ORIGIN_STATE="Andhra Pradesh"
DTDC_ORIGIN_ADDRESS_LINE1="Pusapatirega, Near DTDC Franchise VF1657"
```
