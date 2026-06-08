# Collaborative Document Editor (CollabDoc)

A responsive, high-fidelity collaborative rich-text document editing and sharing application. Users can create, rename, and edit rich-text documents, import `.txt`/`.md` drafts, and share access with other users using granular permissions (Editor vs. Reader).

## 🚀 Key Features

1. **Document Management**: Create new documents, rename documents, delete documents, and auto-save content changes.
2. **Rich Text Formatting**: Edit formatting (Bold, Italic, Underline), hierarchy variations (H1, H2), and structured lists (Bulleted and Numbered lists) using the Tiptap canvas.
3. **File Ingestion**: 
   - Upload and parse `.txt`/`.md` files to automatically generate new formatted documents.
   - Append contents of `.txt`/`.md` files directly at your cursor while editing drafts.
4. **Granular Collaboration Model**:
   - Every document is tied to an owner.
   - Owners can share documents with other users by inputting their username.
   - **Editor (Write Access)**: Shared editors can modify both content and title, and utilize formatting commands.
   - **Reader (Read Only Access)**: Shared readers can view the document and title, but the editor canvas and edit actions are completely locked.
5. **Aesthetic UI**: Dark theme, blur filters (glassmorphism), responsive views, and action spinners.

---

## 🛠️ Technology Stack

- **Frontend**: React (v19), TypeScript, Vite, Material UI (MUI v6/v9), Tiptap Editor (ProseMirror wrapper).
- **Backend**: Spring Boot 3.3.0, Spring Security (Stateless JWT Filter), Spring Data JPA, Java 17.
- **Database**: PostgreSQL (Auto-schema creation).
- **Testing**: JUnit 5, Mockito.

---

## 💻 Local Setup & Execution

### 1. Database Creation
Make sure PostgreSQL is running on port 5432. Connect to it and create the target database:
```sql
CREATE DATABASE doc_editor;
```
*(The default configuration attempts to connect via `jdbc:postgresql://localhost:5432/doc_editor` with username `postgres` and password `postgres`)*

### 2. Run the Spring Boot Backend
Navigate to the `backend` folder and run the Maven wrapper:
```bash
cd backend
# Run automated JUnit tests
./mvnw.cmd test

# Boot the application
./mvnw.cmd spring-boot:run
```
The server will run on `http://localhost:8080`.

### 3. Run the React Frontend
Navigate to the `frontend` folder, install packages, and boot the Vite server:
```bash
cd frontend
npm install
npm run dev
```
The client will open on `http://localhost:5173`. Open a browser to sign up and start editing!

---

## ☁️ Public Deployment Guide

This project is configured to be fully deployable to free open-source hosting servers using environment variables.

### 🗄️ 1. Database Deployment (Supabase)
1. Go to [Supabase](https://supabase.com) and create a free PostgreSQL database project.
2. Go to **Project Settings -> Database** and copy the **Connection string** (URI under the JDBC tab or Transaction Connection string). It will look like:
   `jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres`

### ☕ 2. Backend Deployment (Render)
1. Sign up on [Render](https://render.com) and create a new **Web Service**.
2. Connect your Git repository containing the codebase.
3. Configure the service settings:
   - **Runtime**: `Docker` or `Java`
   - **Build Command**: `cd backend && ./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar backend/target/doceditor-0.0.1-SNAPSHOT.jar`
4. Go to the **Environment** tab and add your production variables:
   - `SPRING_DATASOURCE_URL` = (Your Supabase JDBC string)
   - `SPRING_DATASOURCE_USERNAME` = (Your Supabase database username, e.g. `postgres`)
   - `SPRING_DATASOURCE_PASSWORD` = (Your Supabase database password)
   - `JWT_SECRET` = (A secure random string, e.g., `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970`)

Render will build the backend and expose a public URL (e.g. `https://my-collab-editor-backend.onrender.com`).

### ⚛️ 3. Frontend Deployment (Vercel)
1. Sign up on [Vercel](https://vercel.com) and import your Git repository.
2. In the configuration dashboard, set:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
3. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://my-collab-editor-backend.onrender.com` (Your Render URL)
4. Click **Deploy**. Vercel will host the frontend statically and expose a public web address (e.g., `https://collabdoc-editor.vercel.app`).
