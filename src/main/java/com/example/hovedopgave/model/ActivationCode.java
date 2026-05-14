package com.example.hovedopgave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "activation_codes")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ActivationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activation_code_id")
    private Integer activationCodeId;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "is_used", nullable = false)
    private Boolean isUsed;

    @Column(name = "expiration_date", nullable = false)
    private LocalDateTime expirationDate;

    @ManyToOne(optional = true)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({
            "activationCodes", "bookings", "posts", "comments",
            "createdGroups", "groupMembers", "groupMessages"
    })
    private User user;
}
