package com.example.doceditor.repository;

import com.example.doceditor.model.Document;
import com.example.doceditor.model.DocumentShare;
import com.example.doceditor.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {
    List<DocumentShare> findBySharedWith(User sharedWith);
    List<DocumentShare> findByDocument(Document document);
    Optional<DocumentShare> findByDocumentAndSharedWith(Document document, User sharedWith);
    void deleteByDocument(Document document);
    void deleteByDocumentAndSharedWith(Document document, User sharedWith);
}
