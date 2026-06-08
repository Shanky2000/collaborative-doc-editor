package com.example.doceditor.service;

import com.example.doceditor.model.Document;
import com.example.doceditor.model.DocumentShare;
import com.example.doceditor.model.SharePermission;
import com.example.doceditor.model.User;
import com.example.doceditor.repository.DocumentRepository;
import com.example.doceditor.repository.DocumentShareRepository;
import com.example.doceditor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentShareRepository documentShareRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DocumentService documentService;

    private User owner;
    private User otherUser;
    private Document document;

    @BeforeEach
    void setUp() {
        owner = new User("owner", "owner@example.com", "pass");
        owner.setId(1L);

        otherUser = new User("other", "other@example.com", "pass");
        otherUser.setId(2L);

        document = new Document("My Doc", "<p>Hello</p>", owner);
        document.setId(10L);
    }

    @Test
    void getDocumentForUser_AsOwner_Success() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));

        Document result = documentService.getDocumentForUser(10L, owner);

        assertNotNull(result);
        assertEquals("My Doc", result.getTitle());
    }

    @Test
    void getDocumentForUser_AsSharedUser_Success() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        DocumentShare share = new DocumentShare(document, otherUser, SharePermission.READ);
        when(documentShareRepository.findByDocumentAndSharedWith(document, otherUser))
                .thenReturn(Optional.of(share));

        Document result = documentService.getDocumentForUser(10L, otherUser);

        assertNotNull(result);
        assertEquals("My Doc", result.getTitle());
    }

    @Test
    void getDocumentForUser_AsUnauthorized_ThrowsSecurityException() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        when(documentShareRepository.findByDocumentAndSharedWith(document, otherUser))
                .thenReturn(Optional.empty());

        assertThrows(SecurityException.class, () -> 
            documentService.getDocumentForUser(10L, otherUser)
        );
    }

    @Test
    void updateDocument_AsOwner_Success() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        when(documentRepository.save(any(Document.class))).thenReturn(document);

        Document updated = documentService.updateDocument(10L, "New Title", "<p>New Content</p>", owner);

        assertNotNull(updated);
        assertEquals("New Title", updated.getTitle());
        assertEquals("<p>New Content</p>", updated.getContent());
    }

    @Test
    void updateDocument_AsSharedWriter_Success() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        DocumentShare share = new DocumentShare(document, otherUser, SharePermission.WRITE);
        when(documentShareRepository.findByDocumentAndSharedWith(document, otherUser))
                .thenReturn(Optional.of(share));
        when(documentRepository.save(any(Document.class))).thenReturn(document);

        Document updated = documentService.updateDocument(10L, null, "<p>Collaborative Text</p>", otherUser);

        assertNotNull(updated);
        assertEquals("<p>Collaborative Text</p>", updated.getContent());
    }

    @Test
    void updateDocument_AsSharedReader_ThrowsSecurityException() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        DocumentShare share = new DocumentShare(document, otherUser, SharePermission.READ);
        when(documentShareRepository.findByDocumentAndSharedWith(document, otherUser))
                .thenReturn(Optional.of(share));

        assertThrows(SecurityException.class, () -> 
            documentService.updateDocument(10L, null, "<p>Hacker Edit</p>", otherUser)
        );
    }

    @Test
    void deleteDocument_AsOwner_Success() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));

        documentService.deleteDocument(10L, owner);

        verify(documentRepository, times(1)).delete(document);
    }

    @Test
    void deleteDocument_AsNonOwner_ThrowsSecurityException() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));

        assertThrows(SecurityException.class, () -> 
            documentService.deleteDocument(10L, otherUser)
        );
        verify(documentRepository, never()).delete(any(Document.class));
    }
}
