package com.example.doceditor.service;

import com.example.doceditor.model.Document;
import com.example.doceditor.model.DocumentShare;
import com.example.doceditor.model.SharePermission;
import com.example.doceditor.model.User;
import com.example.doceditor.repository.DocumentRepository;
import com.example.doceditor.repository.DocumentShareRepository;
import com.example.doceditor.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentShareRepository documentShareRepository;

    @Autowired
    private UserRepository userRepository;

    public Document createDocument(String title, String content, User owner) {
        Document document = new Document(title, content, owner);
        return documentRepository.save(document);
    }

    public List<Document> getOwnedDocuments(User owner) {
        return documentRepository.findByOwnerOrderByUpdatedAtDesc(owner);
    }

    public List<Document> getSharedDocuments(User user) {
        List<DocumentShare> shares = documentShareRepository.findBySharedWith(user);
        return shares.stream()
                .map(DocumentShare::getDocument)
                .collect(Collectors.toList());
    }

    public Document getDocumentForUser(Long id, User user) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + id));

        if (document.getOwner().getId().equals(user.getId())) {
            return document;
        }

        Optional<DocumentShare> share = documentShareRepository.findByDocumentAndSharedWith(document, user);
        if (share.isPresent()) {
            return document;
        }

        throw new SecurityException("Access denied: You do not have permission to view this document.");
    }

    public SharePermission getUserPermission(Long documentId, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

        if (document.getOwner().getId().equals(user.getId())) {
            return SharePermission.WRITE; // Owner always has WRITE access
        }

        return documentShareRepository.findByDocumentAndSharedWith(document, user)
                .map(DocumentShare::getPermission)
                .orElseThrow(() -> new SecurityException("Access denied: No permissions for this document."));
    }

    public Document updateDocument(Long id, String title, String content, User user) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + id));

        // Check if owner
        boolean isOwner = document.getOwner().getId().equals(user.getId());
        
        if (!isOwner) {
            // Check if shared writer
            DocumentShare share = documentShareRepository.findByDocumentAndSharedWith(document, user)
                    .orElseThrow(() -> new SecurityException("Access denied: You do not have permission to edit this document."));
            
            if (share.getPermission() != SharePermission.WRITE) {
                throw new SecurityException("Access denied: You only have read-only access to this document.");
            }
        }

        if (title != null && !title.trim().isEmpty()) {
            document.setTitle(title);
        }
        if (content != null) {
            document.setContent(content);
        }

        return documentRepository.save(document);
    }

    public void deleteDocument(Long id, User user) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + id));

        if (!document.getOwner().getId().equals(user.getId())) {
            throw new SecurityException("Access denied: Only the owner can delete this document.");
        }

        // Clean up shares first
        List<DocumentShare> shares = documentShareRepository.findByDocument(document);
        documentShareRepository.deleteAll(shares);

        documentRepository.delete(document);
    }

    public DocumentShare shareDocument(Long documentId, String targetUsername, SharePermission permission, User owner) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

        if (!document.getOwner().getId().equals(owner.getId())) {
            throw new SecurityException("Access denied: Only the owner can share this document.");
        }

        if (document.getOwner().getUsername().equals(targetUsername)) {
            throw new IllegalArgumentException("You cannot share a document with yourself.");
        }

        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found with username: " + targetUsername));

        Optional<DocumentShare> existingShare = documentShareRepository.findByDocumentAndSharedWith(document, targetUser);
        if (existingShare.isPresent()) {
            DocumentShare share = existingShare.get();
            share.setPermission(permission);
            return documentShareRepository.save(share);
        } else {
            DocumentShare newShare = new DocumentShare(document, targetUser, permission);
            return documentShareRepository.save(newShare);
        }
    }

    public void removeShare(Long documentId, String targetUsername, User owner) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

        if (!document.getOwner().getId().equals(owner.getId())) {
            throw new SecurityException("Access denied: Only the owner can manage sharing permissions.");
        }

        User targetUser = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found with username: " + targetUsername));

        DocumentShare share = documentShareRepository.findByDocumentAndSharedWith(document, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Document is not shared with this user."));

        documentShareRepository.delete(share);
    }

    public List<DocumentShare> getDocumentShares(Long documentId, User owner) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found with ID: " + documentId));

        if (!document.getOwner().getId().equals(owner.getId())) {
            throw new SecurityException("Access denied: Only the owner can view share settings.");
        }

        return documentShareRepository.findByDocument(document);
    }

    public String parseFileToHtml(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".txt") && !filename.endsWith(".md"))) {
            throw new IllegalArgumentException("Unsupported file type. Only .txt and .md files are supported.");
        }

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            
            StringBuilder htmlBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                // Escape simple HTML characters and wrap lines in paragraphs
                String escapedLine = line
                        .replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;");
                
                if (escapedLine.trim().isEmpty()) {
                    htmlBuilder.append("<p></p>");
                } else {
                    htmlBuilder.append("<p>").append(escapedLine).append("</p>");
                }
            }
            return htmlBuilder.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read file content: " + e.getMessage(), e);
        }
    }
}
