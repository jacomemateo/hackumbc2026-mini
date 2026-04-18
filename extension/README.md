# Blackboard Grade Harvester 🎓
The Blackboard Ultra Grade Harvester is a browser extension designed to automate the extraction of academic data from the Blackboard Ultra interface.

The primary purpose of this tool is to provide students with a consolidated record of their grades in a portable format. By exporting this data to a spreadsheet, users can more easily track their progress and perform their own manual grade calculations or GPA projections.

## 📋 Scope of Functionality
**What this tool does:**

* Scans your enrolled courses within the Blackboard Ultra environment.

* Consolidates assignment names, categories, and earned scores into a single view.

* Enables data export for external record-keeping.

**What this tool does NOT do:**

* Grade Calculation: This tool cannot calculate your final course grade or GPA. Because Blackboard does not expose specific syllabus weighting (e.g., 15% for Homework, 30% for Exams) through the general interface, all calculations must be performed manually by the user within their spreadsheet software.

* Data Modification: This tool is read-only and does not alter your official academic records.

## 🚀 Usage Instructions
1. **Session Requirements**
Before activating the extension, ensure you are logged into your institutional Blackboard account (e.g., UMBC Blackboard). The extension requires an active session to access your course data.

2. **The Harvesting Process**
   1. Open the extension while on the Blackboard "Institution" or "Courses" page.

   2. Click "Start Harvesting".

   3. **Important:** You must remain on the current browser tab until the process is complete. The extension automates navigation to gather data; closing the tab or navigating away will interrupt the process. Monitor the progress bar for completion status.

3. **Data Export Formats**
Upon completion, you may export your data in two formats:

* XLSX (Microsoft Excel spreadsheet): Optimized for use in Microsoft Excel or Google Sheets. This is the recommended format for users intending to calculate their own grades.

* JSON: A structured data format intended for developers or for use in other software applications.

## 🛠 Installation via GitHub Release
For users who do not wish to use Git or command-line tools, the extension can be installed manually:

1. Navigate to the Releases section of this repository.

2. Download the provided .zip archive (e.g., Harvester-Extension.zip).

3. Extract the contents of the ZIP file to a dedicated folder on your computer.

4. Open your browser's extension management page (e.g., chrome://extensions/ for Chrome or Edge).

5. Enable Developer Mode using the toggle in the top-right corner.

6. Click Load unpacked and select the folder where you extracted the files.

## 🛡 Privacy and Security
All data extraction is performed locally within your browser. No academic information or login credentials are transmitted to external servers or third parties.
