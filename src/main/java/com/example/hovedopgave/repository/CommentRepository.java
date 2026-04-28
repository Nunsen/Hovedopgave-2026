package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Integer> {
}
