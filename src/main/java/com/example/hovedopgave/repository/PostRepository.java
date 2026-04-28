package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Integer> {
}
