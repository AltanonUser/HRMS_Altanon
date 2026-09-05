/**
 * Letter body HTML for each DocumentTemplate, seeded into the DB (DocumentTemplate.htmlBody).
 * Bodies are wrapped by the shared branded shell in renderToPdf.ts at generation time —
 * these only contain the letter-specific content with {{mergeField}} placeholders.
 */

export const OFFER_LETTER_HTML = `
<p class="date">{{issueDate}}</p>
<p>{{candidateName}}<br/>{{candidateAddress}}</p>
<p><strong>Subject: Offer of Employment — {{positionTitle}}</strong></p>
<p>Dear {{candidateFirstName}},</p>
<p>
  Further to your application and the interviews you attended, we are pleased to offer you the position of
  <strong>{{positionTitle}}</strong> in the <strong>{{department}}</strong> department at
  <strong>Altanon AI Works Private Limited</strong> ("the Company"), on the terms set out below.
</p>
<table class="kv">
  <tr><td>Designation</td><td>{{positionTitle}}</td></tr>
  <tr><td>Department</td><td>{{department}}</td></tr>
  <tr><td>Reporting Manager</td><td>{{reportingManagerName}}</td></tr>
  <tr><td>Work Location</td><td>{{workLocation}}</td></tr>
  <tr><td>Date of Joining</td><td>{{joiningDate}}</td></tr>
</table>
<p><strong>Salary Structure (Annual CTC Breakup)</strong></p>
<table class="data">
  <thead><tr><th>Component</th><th class="num">Annual Amount</th></tr></thead>
  <tbody>
    <tr><td>Basic</td><td class="num">{{basicAnnual}}</td></tr>
    <tr><td>House Rent Allowance</td><td class="num">{{hraAnnual}}</td></tr>
    <tr><td>Conveyance Allowance</td><td class="num">{{conveyanceAnnual}}</td></tr>
    <tr><td>Special Allowance</td><td class="num">{{specialAllowanceAnnual}}</td></tr>
    <tr><td>Employer's Provident Fund Contribution</td><td class="num">{{employerPfAnnual}}</td></tr>
    <tr><td><strong>Total Annual CTC</strong></td><td class="num"><strong>{{ctcAnnual}}</strong></td></tr>
  </tbody>
</table>
<p style="font-size: 9.5pt; color: #555;">{{ctcAnnualWords}}</p>

<h3 class="clause">Offer Validity</h3>
<p>
  This offer is open for your written acceptance up to <strong>{{offerValidityDate}}</strong>. If we do not
  receive your acceptance by this date, this offer shall automatically stand withdrawn unless its validity
  is extended by the Company in writing.
</p>

<h3 class="clause">Confidentiality</h3>
<p>
  Please treat the contents of this letter, including your compensation details, as strictly confidential and
  do not share them with anyone other than your immediate family. During and after your employment, you
  shall also keep confidential all non-public information relating to the Company's business, technology,
  clients, and employees that comes into your possession, and shall not disclose or use such information
  except as required to perform your duties for the Company.
</p>

<h3 class="clause">Intellectual Property</h3>
<p>
  All work product, inventions, source code, designs, and other intellectual property created or contributed
  to by you during the course of your employment, in connection with the Company's business, shall be the
  sole and exclusive property of the Company.
</p>

<h3 class="clause">Conditions of This Offer</h3>
<p>
  This offer, and your continued employment, is subject to satisfactory verification of the credentials,
  references, and background information provided by you, and to production of the documents listed below
  at or before joining. The Company reserves the right to withdraw this offer at any time before your date
  of joining, or to terminate your employment after joining, if any information provided by you is found to
  be false, incomplete, or misleading.
</p>
<ul class="doc-list">
  <li>Relieving/experience letter and latest payslips from your previous employer</li>
  <li>Educational qualification certificates and mark sheets</li>
  <li>Government-issued photo ID (Aadhaar / Passport / Driving Licence) and PAN card</li>
  <li>Passport-size photographs</li>
</ul>

<h3 class="clause">Personal Data &amp; Consent</h3>
<p>
  The Company will collect and process the personal data (including identity, contact, educational, and
  employment history details) you provide in connection with this offer, for the purposes of recruitment,
  background verification, and — if you join — your employment records. This data may be shared with the
  Company's background verification partners strictly for that purpose. By accepting this offer, you consent
  to this collection and processing. A separate, detailed background verification consent form covering the
  specific checks to be run will be shared with you ahead of joining.
</p>

<h3 class="clause">Notice Period</h3>
<p>
  Once confirmed as a permanent employee, this employment may be terminated by either party by giving
  <strong>{{noticePeriodDays}} days'</strong> written notice, or payment/recovery of salary in lieu of notice
  not served, subject to the terms of your Appointment Letter.
</p>

<p style="font-size: 9.5pt; color: #555;">
  This offer, your employment, and any disputes arising from either, shall be governed by the laws of India,
  subject to the exclusive jurisdiction of the courts at Pune, Maharashtra.
</p>
<p>
  Please confirm your acceptance of this offer by replying to this email, and indicate your
  agreement to the proposed date of joining. We look forward to welcoming you to the Altanon team.
</p>
<p class="signoff">
  For Altanon AI Works Private Limited,
  <img class="signature-img" src="{{signatureImg}}" alt="signature" />
  {{hrName}}<br/>{{hrTitle}}
</p>
`;

export const INTERNSHIP_LETTER_HTML = `
<p class="date">{{issueDate}}</p>
<p>{{candidateName}}</p>
<p><strong>Subject: Internship Offer — {{positionTitle}}</strong></p>
<p>Dear {{candidateFirstName}},</p>
<p>
  We are pleased to offer you an internship position as <strong>{{positionTitle}}</strong> with
  <strong>Altanon AI Works Private Limited</strong>, under the guidance of {{mentorName}}.
</p>
<table class="kv">
  <tr><td>Role</td><td>{{positionTitle}}</td></tr>
  <tr><td>Department</td><td>{{department}}</td></tr>
  <tr><td>Mentor</td><td>{{mentorName}}</td></tr>
  <tr><td>Work Location</td><td>{{workLocation}}</td></tr>
  <tr><td>Start Date</td><td>{{startDate}}</td></tr>
  <tr><td>End Date</td><td>{{endDate}}</td></tr>
  <tr><td>Monthly Stipend</td><td>{{stipendAmount}}</td></tr>
</table>
<p>
  During the internship, you will be expected to maintain confidentiality of all Company information
  and adhere to the Company's code of conduct. This internship does not guarantee an offer of
  permanent employment; any subsequent offer will be communicated separately based on performance.
</p>
<p>
  Please confirm your acceptance by replying to this email at the earliest.
</p>
<p class="signoff">
  For Altanon AI Works Private Limited,
  <img class="signature-img" src="{{signatureImg}}" alt="signature" />
  {{hrName}}<br/>{{hrTitle}}
</p>
`;

export const RELIEVING_LETTER_HTML = `
<p class="date">{{issueDate}}</p>
<p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p><strong>Subject: Relieving Letter — {{employeeName}} ({{employeeCode}})</strong></p>
<p>Dear {{employeeFirstName}},</p>
<p>
  This is to confirm that you were employed with <strong>Altanon AI Works Private Limited</strong>
  as <strong>{{designation}}</strong> in the {{department}} department from
  <strong>{{dateOfJoining}}</strong> to <strong>{{lastWorkingDay}}</strong>.
</p>
<p>
  Consequent to your resignation, you stand relieved from the services of the Company with effect
  from the close of business on {{lastWorkingDay}}. All dues, if any, will be settled as per the
  Company's full and final settlement process.
</p>
<p>
  We place on record our appreciation for your contribution during your tenure and wish you success
  in your future endeavours.
</p>
<p class="signoff">
  For Altanon AI Works Private Limited,
  <img class="signature-img" src="{{signatureImg}}" alt="signature" />
  {{hrName}}<br/>{{hrTitle}}
</p>
`;

export const EXPERIENCE_LETTER_HTML = `
<p class="date">{{issueDate}}</p>
<p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p><strong>Subject: Experience Certificate — {{employeeName}} ({{employeeCode}})</strong></p>
<p>
  This is to certify that <strong>{{employeeName}}</strong> was employed with
  <strong>Altanon AI Works Private Limited</strong> as <strong>{{designation}}</strong> in the
  {{department}} department from <strong>{{dateOfJoining}}</strong> to
  <strong>{{dateOfLeaving}}</strong>.
</p>
<p>
  During this period, we found {{employeePronoun}} to be sincere, hardworking, and professional.
  {{performanceNote}}
</p>
<p>
  We wish {{employeePronoun}} success in all future endeavours.
</p>
<p class="signoff">
  For Altanon AI Works Private Limited,
  <img class="signature-img" src="{{signatureImg}}" alt="signature" />
  {{hrName}}<br/>{{hrTitle}}
</p>
`;

export const APPOINTMENT_LETTER_HTML = `
<p class="date">{{issueDate}}</p>
<p>{{employeeName}}</p>
<p><strong>Subject: Letter of Appointment — {{designation}}</strong></p>
<p>Dear {{employeeFirstName}},</p>
<p>
  Further to your acceptance of our offer, we are pleased to confirm your appointment as
  <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at
  <strong>Altanon AI Works Private Limited</strong>, effective <strong>{{dateOfJoining}}</strong>,
  on the following terms:
</p>
<table class="kv">
  <tr><td>Designation</td><td>{{designation}}</td></tr>
  <tr><td>Department</td><td>{{department}}</td></tr>
  <tr><td>Reporting Manager</td><td>{{reportingManagerName}}</td></tr>
  <tr><td>Work Location</td><td>{{workLocation}}</td></tr>
  <tr><td>Date of Joining</td><td>{{dateOfJoining}}</td></tr>
  <tr><td>Probation Period</td><td>{{probationMonths}} months</td></tr>
  <tr><td>Annual CTC</td><td>{{ctcAnnual}} ({{ctcAnnualWords}})</td></tr>
</table>
<p>
  Your employment is subject to the Company's HR policies, code of conduct, and confidentiality
  obligations as amended from time to time. During probation, either party may terminate this
  appointment by giving notice as specified in the Company's HR policy. Upon confirmation, your
  employment will continue to be governed by the applicable notice period.
</p>
<p>
  Please sign and return a copy of this letter as a token of your acceptance of the above terms.
</p>
<p class="signoff">
  For Altanon AI Works Private Limited,
  <img class="signature-img" src="{{signatureImg}}" alt="signature" />
  {{hrName}}<br/>{{hrTitle}}<br/><br/>
  Acknowledged &amp; Accepted:<br/><br/>
  ____________________________<br/>
  {{employeeName}}
</p>
`;

export const BACKGROUND_VERIFICATION_CONSENT_HTML = `
<p class="date">{{issueDate}}</p>
<p>{{candidateName}}</p>
<p><strong>Subject: Consent for Collection and Verification of Personal Data</strong></p>
<p>Dear {{candidateName}},</p>
<p>
  As part of your candidacy for the position of <strong>{{positionTitle}}</strong> with
  <strong>Altanon AI Works Private Limited</strong> ("the Company"), the Company needs to verify the
  information you have provided. This notice explains what personal data is collected, why, and your
  rights under the Digital Personal Data Protection Act, 2023 ("DPDP Act"). The Company is the "Data
  Fiduciary" for this data under the DPDP Act.
</p>

<h3 class="clause">Data Collected &amp; Purpose of Verification</h3>
<table class="data">
  <thead><tr><th>Category</th><th>What is collected</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td>Identity</td><td>Full name, date of birth, photograph, government-issued ID</td><td>Confirming your identity</td></tr>
    <tr><td>Address</td><td>Current and permanent address proof</td><td>Confirming your residence</td></tr>
    <tr><td>Education</td><td>Degree/diploma certificates, mark sheets</td><td>Verifying your educational qualifications</td></tr>
    <tr><td>Employment History</td><td>Previous employer name, designation, tenure, relieving/experience letters</td><td>Verifying your work experience</td></tr>
  </tbody>
</table>
<p>
  No other category of personal data will be verified without informing you separately and obtaining your
  consent for that specific check.
</p>

<h3 class="clause">Who Carries Out the Verification</h3>
<p>
  This verification will be carried out by {{verificationPartner}}. Your data will not be used or shared
  for any purpose beyond this verification and, if you join the Company, your subsequent employment
  records.
</p>

<h3 class="clause">Retention</h3>
<p>
  The Company will retain this data for the duration of your employment (if you join) and for
  {{retentionYears}} years thereafter, or as required by applicable law, after which it will be securely
  deleted.
</p>

<h3 class="clause">Your Rights</h3>
<p>
  Under the DPDP Act, you have the right to access the personal data collected about you, request
  correction or erasure, withdraw your consent at any time, and raise a grievance. To exercise any of
  these rights, contact <strong>{{grievanceContact}}</strong>. Withdrawing consent will not affect the
  lawfulness of processing carried out before the withdrawal, but may affect the Company's ability to
  proceed with your candidacy.
</p>

<h3 class="clause">Your Consent</h3>
<p>
  I, <strong>{{candidateName}}</strong>, confirm that I have read and understood this notice. I consent to
  Altanon AI Works Private Limited collecting, processing, and verifying my personal data as described
  above, for the purpose of background verification in connection with my candidacy and, if applicable, my
  employment.
</p>
<p class="signoff">
  ____________________________<br/>
  Signature: {{candidateName}}<br/>
  Date: ____________________
</p>
`;
