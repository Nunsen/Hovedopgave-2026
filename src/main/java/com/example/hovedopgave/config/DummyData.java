package com.example.hovedopgave.config;

import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
public class DummyData {

    @Bean
    CommandLineRunner seedActivationCodes(ActivationCodeRepository activationCodeRepository) {
        return args -> {
            if (activationCodeRepository.findByCodeIgnoreCase("HOVEDOPGAVE-QR-2026").isEmpty()) {
                ActivationCode activationCode = new ActivationCode();
                activationCode.setCode("HOVEDOPGAVE-QR-2026");
                activationCode.setIsUsed(false);
                activationCode.setExpirationDate(LocalDateTime.now().plusYears(1));
                activationCodeRepository.save(activationCode);
            }
        };
    }
}
