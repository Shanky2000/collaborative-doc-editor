package com.example.doceditor.controller;

import com.example.doceditor.model.Document;
import com.example.doceditor.model.DocumentShare;
import com.example.doceditor.model.SharePermission;
import com.example.doceditor.model.User;
import com.example.doceditor.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    private User getAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<?> getAllDocuments() {
        User user = getAuthenticatedUser();
        List<Document> owned = documentService.getOwnedDocuments(user);
        List<Document> shared = documentService.getSharedDocuments(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("owned", owned);
        response.put("shared", shared);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDocumentById(@PathVariable Long id) {
        try {
            User user = getAuthenticatedUser();
            Document document = documentService.getDocumentForUser(id, user);
            SharePermission permission = documentService.getUserPermission(id, user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("document", document);
            response.put("permission", permission);
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createDocument(@RequestBody DocumentRequest request) {
        User user = getAuthenticatedUser();
        String title = request.getTitle() != null ? request.getTitle() : "Untitled Document";
        String content = request.getContent() != null ? request.getContent() : "";
        Document document = documentService.createDocument(title, content, user);
        return ResponseEntity.ok(document);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDocument(@PathVariable Long id, @RequestBody DocumentRequest request) {
        try {
            User user = getAuthenticatedUser();
            Document document = documentService.updateDocument(id, request.getTitle(), request.getContent(), user);
            return ResponseEntity.ok(document);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            User user = getAuthenticatedUser();
            documentService.deleteDocument(id, user);
            return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/shares")
    public ResponseEntity<?> getDocumentShares(@PathVariable Long id) {
        try {
            User user = getAuthenticatedUser();
            List<DocumentShare> shares = documentService.getDocumentShares(id, user);
            
            // Format list to avoid full user entity exposure
            List<Map<String, Object>> result = shares.stream().map(share -> {
                Map<String, Object> m = new HashMap<>();
                m.put("username", share.getSharedWith().getUsername());
                m.put("email", share.getSharedWith().getEmail());
                m.put("permission", share.getPermission());
                return m;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareDocument(@PathVariable Long id, @RequestBody ShareRequest request) {
        try {
            User user = getAuthenticatedUser();
            DocumentShare share = documentService.shareDocument(
                    id, 
                    request.getUsername(), 
                    SharePermission.valueOf(request.getPermission().toUpperCase()), 
                    user
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Document shared successfully with " + request.getUsername(),
                    "permission", share.getPermission()
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/share")
    public ResponseEntity<?> removeShare(@PathVariable Long id, @RequestParam String username) {
        try {
            User user = getAuthenticatedUser();
            documentService.removeShare(id, username, user);
            return ResponseEntity.ok(Map.of("message", "Share removed successfully for " + username));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/import")
    public ResponseEntity<?> importNewDocument(@RequestParam("file") MultipartFile file) {
        try {
            User user = getAuthenticatedUser();
            String htmlContent = documentService.parseFileToHtml(file);
            
            // Derive document title from file name (without extension)
            String filename = file.getOriginalFilename();
            String title = "Imported Document";
            if (filename != null) {
                int dotIndex = filename.lastIndexOf('.');
                if (dotIndex > 0) {
                    title = filename.substring(0, dotIndex);
                } else {
                    title = filename;
                }
            }
            
            Document document = documentService.createDocument(title, htmlContent, user);
            return ResponseEntity.ok(document);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/import")
    public ResponseEntity<?> importToExistingDocument(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            User user = getAuthenticatedUser();
            
            // Check write permission first
            SharePermission permission = documentService.getUserPermission(id, user);
            if (permission != SharePermission.WRITE) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied: You do not have write access to import content."));
            }
            
            String htmlContent = documentService.parseFileToHtml(file);
            return ResponseEntity.ok(Map.of("content", htmlContent));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // --- Request DTOs ---

    public static class DocumentRequest {
        private String title;
        private String content;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }

    public static class ShareRequest {
        private String username;
        private String permission;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPermission() {
            return permission;
        }

        public void setPermission(String permission) {
            this.permission = permission;
        }
    }
}
