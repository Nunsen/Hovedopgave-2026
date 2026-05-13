package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.FaqRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqRequestRepository extends JpaRepository<FaqRequest, Integer> {
    List<FaqRequest> findAllByOrderByCreatedAtDesc();
}
