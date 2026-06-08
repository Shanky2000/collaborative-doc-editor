package com.example.doceditor.repository;

import com.example.doceditor.model.Document;
import com.example.doceditor.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByOwnerOrderByUpdatedAtDesc(User owner);
}
