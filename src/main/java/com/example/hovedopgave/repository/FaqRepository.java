package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Faq;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRepository extends JpaRepository<Faq, Integer> {
    List<Faq> findAllByKindOrderByCategoryAscQuestionAsc(String kind);

    List<Faq> findAllByKindOrderByCreatedAtDesc(String kind);
}
