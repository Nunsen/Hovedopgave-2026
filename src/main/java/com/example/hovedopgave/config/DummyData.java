package com.example.hovedopgave.config;

import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import com.example.hovedopgave.repository.CommentRepository;
import com.example.hovedopgave.repository.PostRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.Optional;

@Configuration
public class DummyData {

    @Bean
    CommandLineRunner seedData(
            ActivationCodeRepository activationCodeRepository,
            UserRepository userRepository,
            PostRepository postRepository,
            CommentRepository commentRepository
    ) {
        return args -> {

            Optional<User> firstUser = userRepository.findAll().stream().findFirst();
            if (firstUser.isEmpty()) {
                return;
            }

            User user = firstUser.get();

            if (activationCodeRepository.findByCodeIgnoreCase("HOVEDOPGAVE-QR-2026").isEmpty()) {
                ActivationCode activationCode = new ActivationCode();
                activationCode.setCode("HOVEDOPGAVE-QR-2026");
                activationCode.setIsUsed(false);
                activationCode.setExpirationDate(LocalDateTime.now().plusYears(1));
                activationCode.setUser(user);
                activationCodeRepository.save(activationCode);
            }

            commentRepository.deleteAll();
            postRepository.deleteAll();

            if (postRepository.count() == 0) {

                postRepository.save(createPost(user,
                        "Vandafbrydelse i morgen",
                        "Der vil vare vandafbrydelse tirsdag d. 11/06 fra 08.00 til 14.00 pga. vedligeholdelse.",
                        "Vigtig info",
                        "bullhorn-outline",
                        true,
                        LocalDateTime.now().minusDays(1)
                ));

                postRepository.save(createPost(user,
                        "Sommerfest 2024",
                        "Saa er det tid til aarets sommerfest. Saet kryds i kalenderen loerdag d. 15/06.",
                        "Begivenhed",
                        "calendar-blank-outline",
                        false,
                        LocalDateTime.now().minusDays(2)
                ));

                postRepository.save(createPost(user,
                        "Pakke til afhentning",
                        "Der er en pakke til dig i administrationen. Husk gyldigt ID ved afhentning.",
                        "Generelt",
                        "package-variant-closed",
                        false,
                        LocalDateTime.now().minusDays(3)
                ));

                postRepository.save(createPost(user,
                        "Rengoering af faellesomraader",
                        "Husk at hjaelpe med at holde vores faellesomraader rene og paene.",
                        "Generelt",
                        "broom",
                        false,
                        LocalDateTime.now().minusDays(5)
                ));

                postRepository.save(createPost(user,
                        "Elevator ude af drift",
                        "Elevatoren forventes ude af drift til og med fredag d. 14/06.",
                        "Vigtig info",
                        "wrench-outline",
                        true,
                        LocalDateTime.now().minusDays(6)
                ));
            }
        };
    }

    private Post createPost(User user, String title, String content, String category, String icon, boolean pinned, LocalDateTime createdAt) {
        Post post = new Post();
        post.setUser(user);
        post.setTitle(title);
        post.setContent(content);
        post.setCategory(category);
        post.setIcon(icon);
        post.setIsImportant(pinned);
        post.setCreatedAt(createdAt);
        return post;
    }
}