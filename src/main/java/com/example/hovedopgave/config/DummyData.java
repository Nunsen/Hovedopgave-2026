package com.example.hovedopgave.config;

import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.Optional;

@Configuration
public class DummyData {

    @Bean
    CommandLineRunner seedActivationCodes(
            ActivationCodeRepository activationCodeRepository,
            UserRepository userRepository
    ) {
        return args -> {
            if (activationCodeRepository.findByCodeIgnoreCase("HOVEDOPGAVE-QR-2026").isEmpty()) {
                Optional<User> firstUser = userRepository.findAll().stream().findFirst();
                if (firstUser.isEmpty()) {
                    return;
                }

                ActivationCode activationCode = new ActivationCode();
                activationCode.setCode("HOVEDOPGAVE-QR-2026");
                activationCode.setIsUsed(false);
                activationCode.setExpirationDate(LocalDateTime.now().plusYears(1));
                activationCode.setUser(firstUser.get());
                activationCodeRepository.save(activationCode);
            }
        };
    }
}
