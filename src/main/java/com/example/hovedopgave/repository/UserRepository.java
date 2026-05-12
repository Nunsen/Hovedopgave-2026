package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    java.util.List<User> findAllByOrderByFirstNameAscLastNameAsc();
    Optional<User> findByEmailIgnoreCase(String email);
}
