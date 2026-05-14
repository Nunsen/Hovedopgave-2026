package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacilityRepository extends JpaRepository<Facility, Integer> {
    Optional<Facility> findFirstByTypeIgnoreCase(String type);

    List<Facility> findAllByTypeIgnoreCaseOrderByNameAsc(String type);
}
