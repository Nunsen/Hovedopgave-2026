package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
}
