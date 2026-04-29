package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.ActivationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ActivationCodeRepository extends JpaRepository<ActivationCode, Integer> {
    Optional<ActivationCode> findByCodeIgnoreCase(String code);
}
