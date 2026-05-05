package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FacilityRepository extends JpaRepository<Facility, Integer> {
    Optional<Facility> findFirstByTypeIgnoreCase(String type);
}
